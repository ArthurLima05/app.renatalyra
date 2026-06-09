import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildPhoneCandidates(phone: string): string[] {
  const candidates = new Set<string>([phone])

  if (phone.startsWith('55') && phone.length >= 12) {
    candidates.add(phone.slice(2))
  }
  if (!phone.startsWith('55') && phone.length >= 10) {
    candidates.add('55' + phone)
  }
  if (phone.startsWith('55') && phone.length === 12) {
    candidates.add(phone.slice(0, 4) + '9' + phone.slice(4))
  }

  return [...candidates]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = Deno.env.get('N8N_WEBHOOK_SECRET')

    if (!expectedKey) {
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

    const { phone, appointmentId, message } = await req.json()

    if (!phone) {
      throw new Error('phone é obrigatório')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    console.log('Processando solicitação de remarcação:', { phone, appointmentId })

    // Busca o paciente tentando todas as variantes de formatação do telefone
    let patient: { id: string; full_name: string; phone: string } | null = null

    for (const candidate of buildPhoneCandidates(phone)) {
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, phone')
        .eq('phone', candidate)
        .maybeSingle()

      if (data) {
        patient = data
        console.log(`Paciente encontrado com telefone: ${candidate}`)
        break
      }
    }

    if (!patient) {
      console.error('Paciente não encontrado para nenhum formato:', phone)
      throw new Error(`Paciente não encontrado para o telefone ${phone}`)
    }

    // Busca o agendamento a remarcar
    let appointment: { id: string; date: string; time: string; status: string } | null = null

    if (appointmentId) {
      const { data } = await supabase
        .from('appointments')
        .select('id, date, time, status')
        .eq('id', appointmentId)
        .eq('patient_id', patient.id)
        .maybeSingle()

      appointment = data
    } else {
      const today = new Date().toISOString().split('T')[0]

      const { data: futuro } = await supabase
        .from('appointments')
        .select('id, date, time, status')
        .eq('patient_id', patient.id)
        .in('status', ['agendado', 'confirmado'])
        .not('notified_24h_at', 'is', null)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle()

      appointment = futuro
    }

    // Atualiza status para 'sugerido' se encontrou agendamento
    if (appointment?.id) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'sugerido' })
        .eq('id', appointment.id)

      if (updateError) {
        console.error('Erro ao atualizar status do agendamento:', updateError)
      } else {
        console.log('Agendamento marcado como sugerido:', appointment.id)
      }
    }

    // Formata data para a mensagem (usando noon UTC para evitar bug de fuso)
    const appointmentDateStr = appointment
      ? new Date(appointment.date.split('T')[0] + 'T12:00:00').toLocaleDateString('pt-BR')
      : null

    const notificationMessage = message
      ? `${patient.full_name} deseja remarcar a consulta. Mensagem: ${message}`
      : `${patient.full_name} deseja remarcar a consulta${appointmentDateStr ? ` marcada para ${appointmentDateStr} às ${appointment!.time.slice(0, 5)}` : ''}`

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'agendamento',
        title: '🔄 Solicitação de Remarcação',
        message: notificationMessage,
        date: new Date().toISOString(),
        read: false,
        patient_id: patient.id,
        appointment_id: appointment?.id ?? null,
      })
      .select()
      .single()

    if (notificationError) throw notificationError

    console.log('Notificação de remarcação criada:', notification)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Solicitação de remarcação registrada',
        notification,
        patient,
        appointment,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em request-reschedule:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
