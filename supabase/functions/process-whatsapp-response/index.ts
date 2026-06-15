import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Gera variantes do telefone para cobrir diferentes formatações no banco:
// com/sem prefixo 55 (DDI) × com/sem o 9º dígito do celular.
// Ex: "5581999662386" → também tenta "81999662386", "8199662386" e "558199662386"
function buildPhoneCandidates(phone: string): string[] {
  const candidates = new Set<string>([phone])

  const withCountryCode = phone.startsWith('55') ? phone : '55' + phone
  const withoutCountryCode = phone.startsWith('55') ? phone.slice(2) : phone

  candidates.add(withCountryCode)
  candidates.add(withoutCountryCode)

  // DDD (2) + 9 + número (8) = 11 dígitos → também tenta sem o 9º dígito
  if (withoutCountryCode.length === 11 && withoutCountryCode[2] === '9') {
    const semNono = withoutCountryCode.slice(0, 2) + withoutCountryCode.slice(3)
    candidates.add(semNono)
    candidates.add('55' + semNono)
  }

  // DDD (2) + número (8) = 10 dígitos → também tenta com o 9º dígito
  if (withoutCountryCode.length === 10) {
    const comNono = withoutCountryCode.slice(0, 2) + '9' + withoutCountryCode.slice(2)
    candidates.add(comNono)
    candidates.add('55' + comNono)
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

    const { buttonId, phone } = await req.json()

    if (!buttonId || !phone) {
      throw new Error('buttonId e phone são obrigatórios')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    console.log('Processando resposta WhatsApp:', { buttonId, phone })

    // Busca todos os pacientes que casam com alguma variante de formatação do telefone.
    // Importante: o mesmo telefone pode estar cadastrado em vários pacientes
    // (ex: familiares que compartilham o número), então não dá para assumir
    // um único resultado aqui.
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, full_name')
      .in('phone', buildPhoneCandidates(phone))

    if (patientsError) throw patientsError

    if (!patients || patients.length === 0) {
      console.error('Paciente não encontrado para nenhum formato:', phone)
      throw new Error(`Paciente não encontrado para o telefone ${phone}`)
    }

    // Busca o agendamento pendente mais próximo que JÁ foi notificado, entre
    // todos os pacientes que compartilham este telefone.
    // Exige notified_24h_at para garantir que o paciente realmente recebeu
    // uma mensagem de confirmação — evita confirmar fora de contexto.
    const today = new Date().toISOString().split('T')[0]

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, date, time, status, professional_id, notified_24h_at, patient_id')
      .in('patient_id', patients.map((p: { id: string; full_name: string }) => p.id))
      .eq('status', 'agendado')
      .not('notified_24h_at', 'is', null)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (appointmentError) throw appointmentError

    if (!appointment) {
      console.error('Nenhum agendamento notificado pendente para o telefone:', phone)
      throw new Error(`Nenhum agendamento aguardando confirmação para o telefone ${phone}`)
    }

    const patient = patients.find((p: { id: string; full_name: string }) => p.id === appointment.patient_id)!

    console.log('Agendamento encontrado:', appointment)

    const newStatus = buttonId === 'confirmar' ? 'confirmado' : 'cancelado'

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointment.id)
      .select()
      .single()

    if (updateError) throw updateError

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em process-whatsapp-response:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
