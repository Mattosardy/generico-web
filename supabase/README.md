# Supabase local para notificaciones WhatsApp

Esta carpeta deja preparado el proyecto para sumar notificaciones por WhatsApp usando:

- Supabase Edge Functions
- Supabase Cron / pg_cron
- Twilio WhatsApp API

## Que incluye

- `migrations/20260417_whatsapp_notifications.sql`
  Agrega campos de trazabilidad a `notificaciones_programadas`, crea `whatsapp_templates`, habilita `pg_cron` y `pg_net`, y crea la funcion SQL `queue_monthly_whatsapp_reminders`.
- `functions/schedule-reminders`
  Edge Function que invoca la generacion de recordatorios del mes.
- `functions/dispatch-whatsapp`
  Edge Function que toma notificaciones pendientes y las envia por Twilio.
- `functions/_shared/twilio.ts`
  Utilidades compartidas para normalizar telefonos Uruguay y enviar mensajes.

## Secrets necesarios

Configurar estos secretos en Supabase antes de desplegar funciones:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

Ejemplo de remitente:

- `whatsapp:+14155238886` para sandbox de Twilio
- `whatsapp:+<numero_propio>` para un numero productivo aprobado

## Cron recomendado

1. Generar recordatorios una vez al dia:

```sql
select
  cron.schedule(
    'schedule-whatsapp-reminders-daily',
    '0 9 * * *',
    $$
    select
      net.http_post(
        url := 'https://<project-ref>.functions.supabase.co/schedule-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer <service-role-or-function-token>'
        ),
        body := jsonb_build_object('target_date', current_date)::text
      );
    $$
  );
```

2. Despachar cola cada 15 minutos:

```sql
select
  cron.schedule(
    'dispatch-whatsapp-queue',
    '*/15 * * * *',
    $$
    select
      net.http_post(
        url := 'https://<project-ref>.functions.supabase.co/dispatch-whatsapp',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer <service-role-or-function-token>'
        ),
        body := '{}'::text
      );
    $$
  );
```

## Pendientes funcionales

- Cambiar el panel admin para que los mensajes manuales carguen `canal = 'whatsapp'`.
- Permitir elegir canal o mantener `email` y `whatsapp` en paralelo.
- Confirmar si el recordatorio del primer jueves se envia a todos los socios o solo a quienes aun no reservaron.
- Reemplazar texto libre por templates de Twilio/Meta si el numero productivo lo exige.

## Nota importante

Esta base local es aditiva y no deberia romper el flujo actual. Las credenciales de Twilio no deben guardarse en tablas visibles al frontend.
