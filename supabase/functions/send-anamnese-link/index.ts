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
    const body = await req.json()
    const { patientId, responseId, token, code } = body

    if (!patientId || !token || !code) {
      throw new Error('patientId, token e code sao obrigatorios')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const n8nWebhookUrl = Deno.env.get('N8N_ANAMNESE_WEBHOOK_URL') ?? ''
    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.renatalyra.com.br'

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: patient, error: ptErr } = await supabase
      .from('patients')
      .select('full_name, phone')
      .eq('id', patientId)
      .single()

    if (ptErr || !patient) throw new Error('Paciente nao encontrado')

    const link = appUrl + '/anamnese/' + token

    // Chama o N8N apenas se o webhook estiver configurado
    if (n8nWebhookUrl) {
      try {
        const res = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientName: patient.full_name,
            patientPhone: patient.phone,
            link,
            code,
            responseId,
          }),
        })
        console.log('Webhook N8N status: ' + res.status)
      } catch (err) {
        // Webhook falhou mas nao quebra a funcao
        console.warn('Webhook N8N falhou (ignorado):', err)
      }
    } else {
      console.warn('N8N_ANAMNESE_WEBHOOK_URL nao configurado — WhatsApp nao enviado')
    }

    return new Response(
      JSON.stringify({
        success: true,
        link,
        patientPhone: patient.phone,
        whatsappSent: n8nWebhookUrl !== '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro em send-anamnese-link:', msg)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
