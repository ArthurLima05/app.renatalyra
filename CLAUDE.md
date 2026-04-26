# CLAUDE.md — Guia do Projeto TechClin

## Visão Geral

Sistema de gestão para clínica de saúde. Permite gerenciar pacientes,
agendamentos, prontuários, financeiro, profissionais e notificações. Integra com
WhatsApp (via n8n) para confirmação/cancelamento de consultas e envio de
feedback.

## Stack Tecnológica

- **Frontend:** React 18 + TypeScript 5 + Vite 5
- **Estilização:** Tailwind CSS v3 + shadcn/ui
- **Estado/Dados:** React Context (ClinicContext) + TanStack React Query
- **Backend:** Supabase — auth, database (PostgreSQL), edge functions
- **Gráficos:** Recharts
- **Exportação Excel:** SheetJS (xlsx)
- **Animações:** Framer Motion

## Estrutura do Projeto

```
src/
├── components/       # Componentes reutilizáveis (Header, Sidebar, Layout, MetricCard, ProtectedRoute, ThemeToggle)
│   └── ui/           # Componentes shadcn/ui
├── contexts/
│   └── ClinicContext.tsx  # Context principal — CRUD de todas as entidades via Supabase
├── hooks/
│   ├── useAuth.tsx        # Autenticação (login/logout)
│   └── useUserRole.tsx    # Roles: admin | secretaria
├── pages/
│   ├── Dashboard.tsx          # Painel principal com métricas
│   ├── Agendamentos.tsx       # Gestão de agendamentos
│   ├── Pacientes.tsx          # Lista e cadastro de pacientes
│   ├── ProntuarioPaciente.tsx # Prontuário individual do paciente
│   ├── Profissionais.tsx      # Gestão de profissionais
│   ├── Financeiro.tsx         # Entradas, saídas, parcelas, exportação Excel
│   ├── Notificacoes.tsx       # Central de notificações
│   └── Login.tsx              # Tela de login
├── types/index.ts     # Tipos TypeScript das entidades
├── data/mockData.ts   # Dados mock (legado)
└── integrations/supabase/  # Client e types (auto-gerados, NÃO editar)

supabase/
└── functions/
    ├── cancel-appointment/         # Cancelar agendamento
    ├── confirm-appointment/        # Confirmar agendamento
    ├── get-pending-confirmations/  # Buscar confirmações pendentes
    ├── process-whatsapp-response/  # Processar respostas do WhatsApp
    └── request-reschedule/         # Solicitar reagendamento
```

## Banco de Dados (Tabelas Principais)

| Tabela          | Descrição                                                 |
| --------------- | --------------------------------------------------------- |
| `patients`      | Pacientes (nome, telefone, email, CPF, origem)            |
| `appointments`  | Agendamentos (paciente, profissional, data, hora, status) |
| `sessions`      | Sessões/consultas (tipo, valor, status pagamento)         |
| `transactions`  | Transações financeiras (entrada/saída)                    |
| `installments`  | Parcelas de pagamentos                                    |
| `professionals` | Profissionais da clínica                                  |
| `notifications` | Notificações do sistema                                   |
| `user_roles`    | Roles dos usuários (admin/secretaria)                     |

### Enums importantes

- `appointment_status`: agendado, confirmado, realizado, cancelado, falta,
  sugerido
- `patient_origin`: Google Ads, Instagram, Indicação, Outro
- `session_type`: primeira_consulta, consulta_avulsa, retorno
- `payment_status`: pago, em_aberto
- `transaction_type`: entrada, saida
- `app_role`: admin, secretaria

## Regras de Negócio

- **Roles:** `admin` tem acesso total; `secretaria` tem acesso restrito (não
  pode deletar transações, etc.)
- **Autenticação:** Obrigatória para todas as rotas exceto `/login`
- **WhatsApp:** Integração via n8n webhooks para confirmação de consultas e
  envio de links de feedback (Google Reviews)
- **Financeiro:** Exportação Excel com abas mensais (JANEIRO–DEZEMBRO) ou por
  período personalizado; mês atual destacado com fundo cinza
- **Parcelas:** Sistema de parcelamento vinculado a sessões

## Arquivos que NÃO devem ser editados

- `src/integrations/supabase/client.ts` (auto-gerado)
- `src/integrations/supabase/types.ts` (auto-gerado)
- `.env` (auto-gerado)

## Comandos

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
```

## Convenções

- Idioma da UI: Português (Brasil)
- Datas: formato `dd/MM/yyyy`, locale `ptBR`
- Moeda: BRL (`R$`)
- Cores: usar tokens semânticos do Tailwind (nunca hardcoded)
- Componentes UI: shadcn/ui como base
