const DEFAULT_COUNTRY_CODE = "+598";

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  whatsappFrom: string;
};

export type SendWhatsAppInput = {
  to: string;
  body: string;
};

export function getTwilioConfigFromEnv(env: Record<string, string | undefined>): TwilioConfig {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = env.TWILIO_AUTH_TOKEN?.trim() || "";
  const whatsappFrom = env.TWILIO_WHATSAPP_FROM?.trim() || "";

  if (!accountSid || !authToken || !whatsappFrom) {
    throw new Error("Faltan secretos de Twilio en el entorno de la funcion.");
  }

  return { accountSid, authToken, whatsappFrom };
}

export function normalizeUyPhone(input: string): string {
  const raw = String(input || "").replace(/[^\d+]/g, "");
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  if (raw.startsWith("598")) return `+${raw}`;
  if (raw.startsWith("09") && raw.length === 9) return `${DEFAULT_COUNTRY_CODE}${raw.slice(1)}`;
  if (raw.startsWith("9") && raw.length === 8) return `${DEFAULT_COUNTRY_CODE}${raw}`;
  return `${DEFAULT_COUNTRY_CODE}${raw.replace(/^0+/, "")}`;
}

export async function sendWhatsAppViaTwilio(
  config: TwilioConfig,
  input: SendWhatsAppInput,
): Promise<{ sid: string; status: string | null }> {
  const body = new URLSearchParams({
    To: `whatsapp:${normalizeUyPhone(input.to)}`,
    From: config.whatsappFrom.startsWith("whatsapp:")
      ? config.whatsappFrom
      : `whatsapp:${config.whatsappFrom}`,
    Body: input.body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio respondio ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return {
    sid: result.sid,
    status: result.status ?? null,
  };
}
