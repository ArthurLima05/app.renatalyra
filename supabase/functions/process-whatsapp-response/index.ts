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
    const { buttonId, phone } = await req.json()

    if (!buttonId || !phone) {
      throw new Error('buttonId e phone são obrigatórios')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Processando resposta WhatsApp:', { buttonId, phone })

    // 3. Busca o paciente pelo telefone (tenta diferentes formatos)
    let patient = null

    let { data } = await supabase
      .from('patients')
      .select('id, full_name')
      .eq('phone', phone)
      .maybeSingle()

    if (data) {
      patient = data
    } else if (phone.length === 12 && phone.startsWith('55')) {
      const phoneWithNine = phone.slice(0, 4) + '9' + phone.slice(4)
      console.log('Tentando formato alternativo:', phoneWithNine)

      const { data: data2 } = await supabase
        .from('patients')
        .select('id, full_name')
        .eq('phone', phoneWithNine)
        .maybeSingle()

      if (data2) patient = data2
    }

    if (!patient) {
      console.error('Paciente não encontrado para nenhum formato:', phone)
      throw new Error(`Paciente não encontrado para o telefone ${phone}`)
    }

    console.log('Paciente encontrado:', patient)

    // 4. Busca o agendamento pendente de hoje ou futuro (evita confirmar consultas passadas esquecidas)
    const today = new Date().toISOString().split('T')[0]
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, date, time, status, professional_id')
      .eq('patient_id', patient.id)
      .eq('status', 'agendado')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (appointmentError || !appointment) {
      console.error('Agendamento não encontrado para paciente:', patient.id)
      throw new Error(`Nenhum agendamento pendente encontrado para ${patient.full_name}`)
    }

    console.log('Agendamento encontrado:', appointment)

    // 5. Define novo status
    const newStatus = buttonId === 'confirmar' ? 'confirmado' : 'cancelado'

    // 6. Atualiza o status do agendamento
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointment.id)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar agendamento:', updateError)
      throw updateError
    }

    console.log(`Agendamento ${newStatus}:`, updatedAppointment)

    return new Response(
      JSON.stringify({
        success: true,
        action: buttonId,
        newStatus,
        appointment: updatedAppointment,
        patient,
        professional_id: appointment.professional_id ?? null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Erro na função process-whatsapp-response:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
