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
    const { patientName, patientPhone, returnDate, notes, message } = body

    if (!patientPhone || !message) {
      return new Response(
        JSON.stringify({ error: 'patientPhone e message são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const webhookUrl = Deno.env.get('N8N_RETURN_ALERT_WEBHOOK_URL')
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'Webhook de retorno não configurado no servidor' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 },
      )
    }

    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientName, patientPhone, returnDate, notes, message }),
    })

    if (!n8nRes.ok) {
      const detail = await n8nRes.text().catch(() => '')
      console.error(`n8n retornou ${n8nRes.status}: ${detail}`)
      return new Response(
        JSON.stringify({ error: `Falha ao acionar o fluxo de alerta (${n8nRes.status})` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em trigger-return-alert:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
