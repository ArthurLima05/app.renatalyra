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
    const { buttonId, phone } = await req.json()

    if (!buttonId || !phone) {
      throw new Error('buttonId e phone são obrigatórios')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Processando resposta WhatsApp:', { buttonId, phone })

    // 1. Busca o paciente pelo telefone
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, full_name')
      .eq('phone', phone)
      .single()

    if (patientError || !patient) {
      console.error('Paciente não encontrado:', phone)
      throw new Error(`Paciente não encontrado para o telefone ${phone}`)
    }

    console.log('Paciente encontrado:', patient)

    // 2. Busca o agendamento do paciente com status "agendado"
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, date, time, status')
      .eq('patient_id', patient.id)
      .eq('status', 'agendado')
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (appointmentError || !appointment) {
      console.error('Agendamento não encontrado para paciente:', patient.id)
      throw new Error(`Nenhum agendamento pendente encontrado para ${patient.full_name}`)
    }

    console.log('Agendamento encontrado:', appointment)

    // 3. Define novo status baseado no buttonId
    const newStatus = buttonId === 'confirmar' ? 'confirmado' : 'cancelado'

    // 4. Atualiza o status do agendamento
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

    // 5. Criar notificação sobre a resposta do paciente
    const notificationMessage = buttonId === 'confirmar' 
      ? `${patient.full_name} confirmou a consulta agendada para ${new Date(appointment.date).toLocaleDateString('pt-BR')} às ${appointment.time}`
      : `${patient.full_name} cancelou a consulta agendada para ${new Date(appointment.date).toLocaleDateString('pt-BR')} às ${appointment.time}`

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: buttonId === 'confirmar' ? 'agendamento' : 'cancelamento',
        title: buttonId === 'confirmar' ? 'Consulta Confirmada' : 'Consulta Cancelada',
        message: notificationMessage,
        patient_id: patient.id,
        appointment_id: appointment.id,
        read: false
      })

    if (notificationError) {
      console.error('Erro ao criar notificação:', notificationError)
      // Não lança erro aqui para não falhar o processo principal
    } else {
      console.log('Notificação criada com sucesso')
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: buttonId,
        newStatus,
        appointment: updatedAppointment,
        patient: patient
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
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
