import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getHoursUntil(date: string, time: string): number {
  const datePart = date.split('T')[0]
  const timePart = time.slice(0, 5)
  const appointmentDate = new Date(`${datePart}T${timePart}:00-03:00`)
  return (appointmentDate.getTime() - Date.now()) / (1000 * 60 * 60)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Valida a API key do n8n
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = Deno.env.get('N8N_WEBHOOK_SECRET')

    if (!expectedKey) {
      console.error('N8N_WEBHOOK_SECRET não configurado')
      return new Response(
        JSON.stringify({ success: false, error: 'Serviço não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 },
      )
    }

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        status,
        notes,
        patient_id,
        professional_id,
        notified_24h_at,
        notified_12h_at,
        notified_3h_at,
        patients (id, full_name, phone, email),
        professionals (id, name, specialty)
      `)
      .eq('status', 'agendado')
      .order('date', { ascending: true })

    if (error) throw error

    const { data: setting } = await supabase
      .from('clinic_settings')
      .select('value')
      .eq('key', 'msg_appointment_confirmation')
      .maybeSingle()

    const { data: setting12h } = await supabase
      .from('clinic_settings')
      .select('value')
      .eq('key', 'msg_confirmation_12h')
      .maybeSingle()

    const confirmationMessage = setting?.value
      ?? 'Olá {{nome_paciente}}, tudo bem? Sua consulta está marcada para {{data}} às {{hora}}. Por favor, confirme sua presença.'

    const confirmationMessage12h = setting12h?.value
      ?? '🔔 Ainda aguardamos sua confirmação.\n\nOlá {{nome_paciente}}, sua consulta está marcada para {{data}} às {{hora}}.'

    const appointments_24h = []
    const appointments_12h = []
    const appointments_3h = []
    const debug = []

    for (const appt of (appointments ?? [])) {
      const hours = getHoursUntil(appt.date, appt.time)
      debug.push({ id: appt.id, date: appt.date, time: appt.time, hours_until: Math.round(hours * 100) / 100 })

      if (hours >= 22 && hours <= 26 && !appt.notified_24h_at) {
        appointments_24h.push(appt)
      } else if (hours >= 10 && hours <= 14 && !appt.notified_12h_at) {
        appointments_12h.push(appt)
      } else if (hours >= 2 && hours <= 4 && !appt.notified_3h_at) {
        appointments_3h.push(appt)
      }
    }

    console.log(`Notificações pendentes — 24h: ${appointments_24h.length}, 12h: ${appointments_12h.length}, 3h: ${appointments_3h.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        appointments_24h,
        appointments_12h,
        appointments_3h,
        confirmationMessage,
        confirmationMessage12h,
        debug,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro na função get-pending-confirmations:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
