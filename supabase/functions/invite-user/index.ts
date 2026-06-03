import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ModulePerms = { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }
type PermsMap = Record<string, ModulePerms>

function getDefaultPermissions(profile: string): PermsMap {
  const all: Record<string, PermsMap> = {
    administrador: {
      agenda:        { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
      dashboard:     { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
      financeiro:    { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
      profissionais: { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: true },
      configuracoes: { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
    },
    auxiliar_tecnico: {
      agenda:        { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      dashboard:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: true,  canCreate: false, canEdit: true,  canDelete: false },
      financeiro:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
      profissionais: { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    profissional: {
      agenda:        { canView: true,  canCreate: false, canEdit: true,  canDelete: false },
      dashboard:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: true,  canCreate: false, canEdit: true,  canDelete: false },
      financeiro:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
      profissionais: { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    financeiro: {
      agenda:        { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      dashboard:     { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
      financeiro:    { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      profissionais: { canView: false, canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    gestor_relacionamento: {
      agenda:        { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      dashboard:     { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: true,  canCreate: false, canEdit: true,  canDelete: false },
      financeiro:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
      profissionais: { canView: false, canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    recepcionista: {
      agenda:        { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      dashboard:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      financeiro:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
      profissionais: { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    marketing: {
      agenda:        { canView: false, canCreate: false, canEdit: false, canDelete: false },
      dashboard:     { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
      financeiro:    { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      profissionais: { canView: false, canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
      funil:         { canView: true,  canCreate: true,  canEdit: true,  canDelete: true  },
    },
  }
  return all[profile] ?? all['recepcionista']
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, fullName, phone, profile } = await req.json()

    if (!email || !fullName || !profile) {
      return new Response(
        JSON.stringify({ error: 'email, fullName e profile são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.renatalyra.com.br'
    const redirectTo = `${appUrl}/aceitar-convite`

    // Pré-cria o perfil na tabela app_users antes de enviar o convite,
    // usando upsert por email para o caso de o usuário já existir.
    // O id será atualizado depois se o usuário for novo.
    let userId: string | null = null

    // Tenta enviar convite (cria usuário novo e envia email automaticamente)
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: { full_name: fullName },
      }
    )

    if (inviteError) {
      // Usuário já existe — busca o id existente e envia email de recuperação de senha
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        return new Response(
          JSON.stringify({ error: listError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        )
      }

      const existingUser = listData.users.find((u: { email?: string }) => u.email === email)
      if (!existingUser) {
        return new Response(
          JSON.stringify({ error: inviteError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        )
      }

      userId = existingUser.id

      // Envia email de redefinição de senha para o usuário já existente
      const { error: recoveryError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      })

      // Ignora erro de recovery — o importante é atualizar permissões
      if (recoveryError) {
        console.warn('Recovery link error (non-fatal):', recoveryError.message)
      }
    } else {
      userId = inviteData.user.id
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível obter o ID do usuário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // Upsert perfil em app_users
    const { error: profileError } = await supabase.from('app_users').upsert({
      id: userId,
      email,
      full_name: fullName,
      phone: phone ?? null,
      profile,
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    // Upsert permissões padrão
    const defaultPerms = getDefaultPermissions(profile)
    const permsRows = Object.entries(defaultPerms).map(([module, p]) => ({
      user_id: userId,
      module,
      can_view: p.canView,
      can_create: p.canCreate,
      can_edit: p.canEdit,
      can_delete: p.canDelete,
    }))

    const { error: permsError } = await supabase.from('user_permissions')
      .upsert(permsRows, { onConflict: 'user_id,module' })
    if (permsError) console.error('Permissions error:', permsError)

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro em invite-user:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
