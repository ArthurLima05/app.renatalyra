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
    // 1. Verifica autenticação do chamador
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Valida o JWT com a chave anon (respeita a sessão real do usuário)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      )
    }

    // 2. Verifica se o chamador é administrador
    const { data: callerProfile } = await supabaseAuth
      .from('app_users')
      .select('profile')
      .eq('id', caller.id)
      .single()
    if (callerProfile?.profile !== 'administrador') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 },
      )
    }

    // 3. Valida o payload
    const { professionalId, userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // Service role bypassa RLS — seguro pois o chamador já foi validado acima
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
