import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // 2. Valida o payload
    const { phone, appointmentId, message } = await req.json()

    if (!phone) {
      throw new Error('phone é obrigatório')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Processando solicitação de remarcação:', { phone, appointmentId })

    // 3. Busca o paciente pelo telefone (tenta diferentes formatos)
    let patient = null

    const { data } = await supabase
      .from('patients')
      .select('id, full_name, phone')
      .eq('phone', phone)
      .maybeSingle()

    if (data) {
      patient = data
    } else if (phone.length === 12 && phone.startsWith('55')) {
      const phoneWithNine = phone.slice(0, 4) + '9' + phone.slice(4)
      console.log('Tentando formato alternativo:', phoneWithNine)

      const { data: data2 } = await supabase
        .from('patients')
        .select('id, full_name, phone')
        .eq('phone', phoneWithNine)
        .maybeSingle()

      if (data2) patient = data2
    }

    if (!patient) {
      console.error('Paciente não encontrado para nenhum formato:', phone)
      throw new Error(`Paciente não encontrado para o telefone ${phone}`)
    }

    console.log('Paciente encontrado:', patient)

    // 4. Busca agendamento
    let appointment = null

    if (appointmentId) {
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('id, date, time, status')
        .eq('id', appointmentId)
        .eq('patient_id', patient.id)
        .maybeSingle()

      appointment = appointmentData
    } else {
      const today = new Date().toISOString().split('T')[0]
      const { data: agendado } = await supabase
        .from('appointments')
        .select('id, date, time, status')
        .eq('patient_id', patient.id)
        .in('status', ['agendado', 'confirmado'])
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (agendado) {
        appointment = agendado
      } else {
        const { data: cancelado } = await supabase
          .from('appointments')
          .select('id, date, time, status')
          .eq('patient_id', patient.id)
          .eq('status', 'cancelado')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle()

        appointment = cancelado
      }
    }

    // 5. Atualiza status para 'sugerido'
    if (appointment?.id) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'sugerido' })
        .eq('id', appointment.id)

      if (updateError) {
        console.error('Erro ao atualizar status do agendamento:', updateError)
      } else {
        console.log('Status do agendamento atualizado para sugerido:', appointment.id)
      }
    }

    // 6. Cria notificação de remarcação
    const notificationMessage = message
      ? `${patient.full_name} deseja remarcar a consulta. Mensagem: ${message}`
      : `${patient.full_name} deseja remarcar a consulta${appointment ? ` que estava agendada para ${new Date(appointment.date).toLocaleDateString('pt-BR')} às ${appointment.time}` : ''}`

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'agendamento',
        title: 'Solicitação de Remarcação',
        message: notificationMessage,
        date: new Date().toISOString(),
        read: false,
        patient_id: patient.id,
        appointment_id: appointment?.id || null,
      })
      .select()
      .single()

    if (notificationError) {
      console.error('Erro ao criar notificação:', notificationError)
      throw notificationError
    }

    console.log('Notificação de remarcação criada:', notification)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Solicitação de remarcação registrada com sucesso',
        notification,
        patient,
        appointment,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro na função request-reschedule:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
