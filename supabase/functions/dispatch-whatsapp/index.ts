import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTwilioConfigFromEnv, sendWhatsAppViaTwilio } from "../_shared/twilio.ts";

type NotificationRow = {
  id: string;
  mensaje: string;
  socio_id: string;
  socios: { telefono: string | null; nombre: string | null; apellido: string | null } | null;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Faltan secretos de Supabase para ejecutar la funcion.");
    }

    const twilio = getTwilioConfigFromEnv(Deno.env.toObject());
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("notificaciones_programadas")
      .select("id, mensaje, socio_id, socios(telefono, nombre, apellido)")
      .eq("estado", "pendiente")
      .eq("canal", "whatsapp")
      .lte("fecha_programada", new Date().toISOString())
      .order("fecha_programada", { ascending: true })
      .limit(50);

    if (error) throw error;

    const notifications = (data ?? []) as NotificationRow[];
    const results: Array<{ id: string; status: string; detail?: string }> = [];

    for (const item of notifications) {
      const telefono = item.socios?.telefono?.trim();
      if (!telefono) {
        await supabase
          .from("notificaciones_programadas")
          .update({
            estado: "error",
            error_detalle: "El socio no tiene telefono configurado.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        results.push({ id: item.id, status: "error", detail: "telefono faltante" });
        continue;
      }

      try {
        const sendResult = await sendWhatsAppViaTwilio(twilio, {
          to: telefono,
          body: item.mensaje,
        });

        await supabase
          .from("notificaciones_programadas")
          .update({
            estado: "enviado",
            fecha_envio: new Date().toISOString(),
            provider: "twilio",
            provider_message_sid: sendResult.sid,
            error_detalle: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({ id: item.id, status: "enviado" });
      } catch (sendError) {
        await supabase
          .from("notificaciones_programadas")
          .update({
            estado: "error",
            error_detalle: sendError instanceof Error ? sendError.message : "Error desconocido al enviar.",
            provider: "twilio",
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          status: "error",
          detail: sendError instanceof Error ? sendError.message : "unknown",
        });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
