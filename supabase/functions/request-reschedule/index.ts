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
    const { phone, appointmentId, message } = await req.json()

    if (!phone) {
      throw new Error('phone é obrigatório')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Processando solicitação de remarcação:', { phone, appointmentId })

    // 1. Busca o paciente pelo telefone (tenta diferentes formatos)
    let patient = null
    
    // Tenta primeiro com o telefone exato
    let { data } = await supabase
      .from('patients')
      .select('id, full_name, phone')
      .eq('phone', phone)
      .maybeSingle()

    if (data) {
      patient = data
    } else if (phone.length === 12 && phone.startsWith('55')) {
      // Se não encontrou e o telefone tem 12 dígitos, tenta adicionar um 9
      const phoneWithNine = phone.slice(0, 4) + '9' + phone.slice(4)
      console.log('Tentando formato alternativo:', phoneWithNine)
      
      const { data: data2 } = await supabase
        .from('patients')
        .select('id, full_name, phone')
        .eq('phone', phoneWithNine)
        .maybeSingle()
      
      if (data2) {
        patient = data2
      }
    }

    if (!patient) {
      console.error('Paciente não encontrado para nenhum formato:', phone)
      throw new Error(`Paciente não encontrado para o telefone ${phone}`)
    }

    console.log('Paciente encontrado:', patient)

    // 2. Se appointmentId foi fornecido, busca esse agendamento específico
    // Senão, busca o último agendamento cancelado do paciente
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
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('id, date, time, status')
        .eq('patient_id', patient.id)
        .eq('status', 'cancelado')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      appointment = appointmentData
    }

    // 3. Cria notificação urgente de remarcação
    const notificationMessage = message 
      ? `🔴 URGENTE: ${patient.full_name} deseja remarcar a consulta. Mensagem: ${message}`
      : `🔴 URGENTE: ${patient.full_name} deseja remarcar a consulta${appointment ? ` que estava agendada para ${new Date(appointment.date).toLocaleDateString('pt-BR')} às ${appointment.time}` : ''}`

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'agendamento',
        title: '🔴 Solicitação de Remarcação',
        message: notificationMessage,
        date: new Date().toISOString(),
        read: false,
        patient_id: patient.id,
        appointment_id: appointment?.id || null
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
        patient: patient,
        appointment: appointment
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Erro na função request-reschedule:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
