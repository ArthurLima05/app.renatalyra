import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Gera variantes do telefone para cobrir diferentes formatações no banco
// Ex: "5511987654321" → também tenta "11987654321" (sem prefixo 55)
function buildPhoneCandidates(phone: string): string[] {
  const candidates = new Set<string>([phone])

  if (phone.startsWith('55') && phone.length >= 12) {
    candidates.add(phone.slice(2)) // sem prefixo 55
  }
  if (!phone.startsWith('55') && phone.length >= 10) {
    candidates.add('55' + phone) // com prefixo 55
  }
  // Formato antigo sem 9º dígito (12 dígitos com 55)
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

    const { buttonId, phone } = await req.json()

    if (!buttonId || !phone) {
      throw new Error('buttonId e phone são obrigatórios')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    console.log('Processando resposta WhatsApp:', { buttonId, phone })

    // Busca o paciente tentando todas as variantes de formatação do telefone
    let patient: { id: string; full_name: string } | null = null

    for (const candidate of buildPhoneCandidates(phone)) {
      const { data } = await supabase
        .from('patients')
        .select('id, full_name')
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

    // Busca o agendamento pendente mais próximo que JÁ foi notificado.
    // Exige notified_24h_at para garantir que o paciente realmente recebeu
    // uma mensagem de confirmação — evita confirmar fora de contexto.
    const today = new Date().toISOString().split('T')[0]

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, date, time, status, professional_id, notified_24h_at')
      .eq('patient_id', patient.id)
      .eq('status', 'agendado')
      .not('notified_24h_at', 'is', null)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (appointmentError || !appointment) {
      console.error('Nenhum agendamento notificado pendente para:', patient.id)
      throw new Error(`Nenhum agendamento aguardando confirmação para ${patient.full_name}`)
    }

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
