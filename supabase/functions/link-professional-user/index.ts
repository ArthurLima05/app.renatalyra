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
    const { professionalId, userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // Service role bypassa RLS completamente
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Remove vínculo anterior deste usuário (se houver)
    await supabase
      .from('professionals')
      .update({ user_id: null })
      .eq('user_id', userId)

    // Cria o novo vínculo (se professionalId foi informado)
    if (professionalId) {
      const { error } = await supabase
        .from('professionals')
        .update({ user_id: userId })
        .eq('id', professionalId)

      if (error) {
        console.error('Erro ao vincular profissional:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        )
      }
    }

    console.log(`Profissional ${professionalId ?? 'nenhum'} vinculado ao usuário ${userId}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em link-professional-user:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
