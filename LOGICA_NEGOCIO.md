# Lógica de Negócio — TechClin

> Documento gerado em 2026-04-16. Descreve o comportamento atual do sistema,
> fluxos implementados e inconsistências identificadas.

---

## 1. Autenticação e Papéis

O sistema possui dois papéis (`app_role`):

| Role | Capacidades |
|------|-------------|
| **admin** | Acesso total: dashboard financeiro, exclusão de transações, relatórios, exportação Excel |
| **secretaria** | Apenas registra lançamentos financeiros. Não vê totais nem analytics |

O controle de acesso é feito **exclusivamente no frontend** via `useUserRole`. Não há RLS (Row Level Security) configurado no Supabase para reforçar isso no banco.

---

## 2. Pacientes

**Campos obrigatórios na criação:** nome completo, telefone, origem (Google Ads / Instagram / Indicação / Outro).  
**Campos opcionais:** email, data de nascimento, CPF, observações iniciais.

O telefone é o identificador-chave para integração com WhatsApp.

**Lógica de "Última Consulta" e "Próxima Consulta"** (exibida na lista de pacientes):
- Última Consulta → sessão mais recente com `status = 'realizado'`
- Próxima Consulta → sessão mais próxima com `status = 'agendado'` ou `'confirmado'`

Deleção é permanente (hard-delete), sem auditoria.

---

## 3. Agendamentos

### Status possíveis

```
agendado → confirmado → realizado
         ↘ cancelado
         ↘ falta
sugerido  (proposta de retorno — criado via Prontuário)
```

### Regras de validação

- Horário de funcionamento: **08h00 às 18h00**, slots de 30 minutos.
- Não pode haver dois agendamentos no **mesmo dia + horário** (exceto cancelados).
- Data deve ser futura ao criar.

### Comportamentos automáticos por mudança de status

| Status novo | O que acontece |
|-------------|----------------|
| `agendado` | Cria notificação "Novo agendamento" |
| `confirmado` | Cria notificação "Consulta confirmada" |
| `cancelado` | Cria notificação urgente de cancelamento |
| `falta` | Cria notificação urgente de falta |
| `realizado` | Dispara webhook n8n → envia WhatsApp com link de avaliação Google |

### Webhook de feedback (n8n)

Acionado ao marcar consulta como `realizado`. Envia para o paciente via WhatsApp:
- Nome do paciente, telefone, data/hora da consulta
- Link fixo de avaliação Google Maps da clínica

---

## 4. Sessões (Prontuário)

Sessões são o **registro clínico** de um atendimento. Criadas dentro do Prontuário do Paciente.

**Campos principais:**
- `type` (string livre): título do atendimento — ex: "Limpeza", "Botox", "Canal"
- `sessionType` (enum): `primeira_consulta | retorno | consulta_avulsa`
- `amount`: valor cobrado
- `paymentStatus`: `pago | em_aberto`
- `notes`: observações clínicas da doutora
- `nextAppointment`: data sugerida para próximo retorno (opcional)

### Criação e parcelamento

1. Ao criar sessão com `paymentStatus = 'pago'` e `amount > 0`:
   - Cria automaticamente uma **transação de entrada** com categoria "Consulta"
2. Ao criar sessão com `paymentStatus = 'em_aberto'` e parcelamento habilitado:
   - Cria N **installments** com valor = `amount / N`, datas mensais a partir da data da 1ª parcela

### Sincronismo automático de pagamento

Quando **todas as parcelas** de uma sessão são marcadas como pagas:
- `session.paymentStatus` atualiza automaticamente para `'pago'`
- Não cria nova transação nesse momento (cada parcela já criou a sua)

---

## 5. Parcelas (Installments)

Geradas automaticamente na criação de sessão com parcelamento (2 a 12 parcelas).

**Ao marcar uma parcela como paga:**
1. `paid = true`, `paidDate = hoje`
2. Cria transação de entrada automática
3. Verifica se todas as parcelas da sessão estão pagas → se sim, atualiza `paymentStatus` da sessão

**Notificação automática:** parcelas vencidas (`predictedDate < hoje` e `paid = false`) geram notificação do tipo `lembrete_pagamento`, classificada como urgente.

---

## 6. Financeiro (Transactions)

Dois tipos: `entrada` e `saida`.

**Criação manual:** todos os campos obrigatórios (tipo, descrição, valor, data, categoria).  
**Criação automática:** ao marcar sessão como paga (sem parcelas) ou ao marcar parcela como paga.

**Cálculos:**
- Total Entradas = soma de todas as transações `type = 'entrada'`
- Total Saídas = soma de todas as transações `type = 'saida'`
- Saldo = Entradas − Saídas

**Filtros de período:** Hoje | Esta Semana | Este Mês | Este Ano | Personalizado.

**Exportação Excel:** duas modalidades — anual (12 abas mensais) ou por período personalizado. Mês atual destacado em cinza.

---

## 7. Notificações

Geradas automaticamente pelo sistema (`ClinicContext`) e pelas Edge Functions.

| Tipo | Gatilho |
|------|---------|
| `agendamento` | Novo appointment criado |
| `cancelamento` | Status → cancelado |
| `falta` | Status → falta |
| `lembrete_consulta` | 3 horas antes do horário agendado |
| `lembrete_prontuario` | Appointment "realizado" há ≤ 3 dias (checagem periódica) |
| `lembrete_pagamento` | Parcela vencida (predictedDate < hoje, paid = false) |

**Urgência:**
- `cancelamento` → urgente se criado há menos de 24h
- `lembrete_pagamento` → sempre urgente
- Título "Solicitação de Remarcação" → sempre urgente

**Agrupamento na UI:** Hoje | Ontem | Esta Semana | Mais Antigas. Urgentes aparecem primeiro.

**Ações em massa:** marcar como lidas, deletar selecionadas, marcar todas como lidas.

---

## 8. Integração WhatsApp (via n8n + Edge Functions)

### Fluxo de confirmação

```
1. Paciente recebe WhatsApp: "Confirmar / Cancelar"
2. Clica em um dos botões
3. n8n chama POST /process-whatsapp-response { phone, buttonId }
4. Edge function busca paciente pelo telefone
5. Busca appointment com status='agendado' mais próximo
6. Atualiza status: confirmar → 'confirmado' | cancelar → 'cancelado'
7. Realtime do Supabase atualiza o frontend em tempo real
```

**Tratamento de telefone na busca:** tenta o número exato e também a versão com dígito 9 inserido após o DDD (compatibilidade com números antigos de 8 dígitos).

### Fluxo de remarcação

```
1. Paciente clica "Remarcar" no WhatsApp
2. n8n chama POST /request-reschedule { phone }
3. Edge function busca paciente + último appointment cancelado
4. Cria notificação urgente: "Solicitação de Remarcação"
5. Admin vê na aba de notificações e agenda manualmente
```

### Fluxo de confirmações pendentes

- `GET /get-pending-confirmations` retorna todos appointments com `status = 'agendado'`
- Usado pelo n8n para saber quem ainda não confirmou e disparar lembretes

---

## 9. Dashboard

| Métrica | Cálculo |
|---------|---------|
| Total de Atendimentos | Appointments com `status = 'realizado'` |
| Taxa de Retorno | Sessions com `sessionType = 'retorno'` ÷ total sessions × 100 |
| Faltas/Cancelamentos | Appointments com `status = 'cancelado'` ou `'falta'` |
| Confirmados | Appointments com `status = 'confirmado'` |

Gráficos: origem dos pacientes (pizza) e distribuição de status (barras).

---

## 10. Profissionais

Cadastro de nome, especialidade, email e telefone. Sem funcionalidade ativa além de listagem. O campo `averageRating` existe mas não é calculado nem exibido em lugar nenhum.

---

---

# Inconsistências e Redundâncias Identificadas

A seguir, os pontos do sistema que estão **redundantes, sem uso ou semanticamente incorretos**.

---

## [CRÍTICO] Sessions usam `AppointmentStatus` como status

**O problema:** A entidade `Session` (prontuário/registro clínico) usa o mesmo enum `AppointmentStatus` de agendamentos:
```
agendado | confirmado | realizado | cancelado | falta | sugerido
```
Isso não faz sentido semântico. Uma sessão clínica não é "agendada" ou "confirmada" — ela é um **registro do que aconteceu**, não um evento futuro. O status `'sugerido'` como valor padrão na criação é especialmente confuso: toda sessão nova nasce como "sugerida", mas na prática representa uma consulta que **já foi realizada** e está sendo documentada.

**Impacto:** Confusão conceitual entre agendamento (evento futuro) e sessão (registro clínico passado). A UI mescla os dois em alguns pontos, tornando difícil entender o que cada coisa representa.

**Sugestão:** Criar um enum próprio para sessions: `rascunho | registrado | arquivado` ou simplesmente remover o campo status de Session, já que o que importa é `paymentStatus`.

---

## [CRÍTICO] Sessions têm dois campos de "tipo" que se sobrepõem

A tabela `sessions` tem **dois campos distintos para tipo de atendimento**:

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `type` | string livre | "Limpeza", "Botox", "Canal" |
| `sessionType` | enum | `primeira_consulta | retorno | consulta_avulsa` |

O `type` é o título descritivo do procedimento. O `sessionType` é a classificação clínica. São conceitos diferentes, mas a coexistência de ambos gera dúvida: qual usar para filtrar? Qual aparece no prontuário? O Dashboard usa `sessionType` para calcular taxa de retorno, mas a UI principal exibe `type`.

**Sugestão:** Renomear `type` para `procedure` (procedimento) para deixar claro que são dimensões diferentes e não duplicatas.

---

## [MÉDIO] `origin` duplicado em Appointments

O campo `origin: PatientOrigin` (Google Ads | Instagram | Indicação | Outro) existe tanto em `patients` quanto em `appointments`.

A origem é uma característica do **paciente** (de onde ele veio para a clínica), não de cada consulta individual. Registrar origem em cada agendamento não agrega informação nova — é sempre a mesma origem do paciente, duplicada.

**Impacto:** Dado redundante em cada linha de `appointments`. Se a origem do paciente for atualizada, os agendamentos antigos ficam com dados divergentes.

**Sugestão:** Remover `origin` de `appointments` e ler sempre de `patients.origin`.

---

## [MÉDIO] Tabela `feedbacks` existe mas nunca é usada

O banco tem a tabela `feedbacks` com estrutura completa (rating, comment, patient_id, professional_id, etc.) e os tipos TypeScript correspondentes estão em `types.ts`. No entanto, **nenhuma página, contexto ou edge function escreve ou lê dessa tabela**.

O feedback atual funciona assim: ao marcar consulta como "realizada", envia WhatsApp com link direto para o Google Maps — o cliente avalia no Google, não dentro do sistema.

**Impacto:** Tabela morta no banco. Os tipos `feedback` e `lembrete_feedback` no enum `notification_type` também são definidos mas nunca disparados.

**Sugestão:** Ou implementar a funcionalidade de coleta de feedback interno (usando a tabela), ou remover a tabela e os tipos para não gerar confusão.

---

## [MÉDIO] `averageRating` em Professionals nunca é calculado

O campo `professionals.average_rating` existe no banco e no tipo `Professional`, mas:
- Nenhuma lógica o calcula
- Nenhuma tela o exibe
- A tabela `feedbacks` (que alimentaria esse valor) também não é usada

**Sugestão:** Remover o campo ou implementar o cálculo a partir dos feedbacks.

---

## [MÉDIO] Tipos de notificação definidos mas não implementados

O enum `notification_type` define 8 tipos, mas dois deles não têm nenhum gatilho no código:

| Tipo | Status |
|------|--------|
| `feedback` | Definido, nunca criado |
| `lembrete_feedback` | Definido, nunca criado |

**Sugestão:** Remover do enum ou implementar o disparo.

---

## [LEVE] `lembrete_prontuario` verifica appointments, mas as notas ficam nas Sessions

A lógica atual é:
> "Se um appointment com `status = 'realizado'` tem menos de 3 dias e não há notas → cria notificação"

O problema: **appointments não têm campo `notes` clínico**. As observações da doutora ficam em `sessions.notes`. A verificação deveria ser feita nas sessions vinculadas ao appointment, não no appointment em si.

Na prática a notificação pode ser gerada mesmo quando a doutora já preencheu o prontuário da sessão correspondente.

**Sugestão:** Ajustar a lógica para verificar se a session vinculada ao appointment tem `notes` preenchido.

---

## [LEVE] Tabela `professionals` existe para múltiplos profissionais, mas o sistema é monoprofissional

O design do banco suporta N profissionais. Porém, em vários pontos do código o profissional "Renata Lyra" é buscado **hardcoded por nome** no array de profissionais. Isso quebra se:
- O nome for alterado no banco
- Um segundo profissional for adicionado no futuro

**Sugestão:** Definir um campo `is_default` ou `is_owner` na tabela `professionals`, ou assumir explicitamente que o sistema é monoprofissional e simplificar (remover a tela de Profissionais se não há plano de expansão).

---

## Resumo das Inconsistências

| # | Severidade | Problema | Área |
|---|-----------|----------|------|
| 1 | Crítico | Sessions usam `AppointmentStatus` semanticamente errado | Prontuário |
| 2 | Crítico | `type` e `sessionType` são campos redundantes em Sessions | Prontuário |
| 3 | Médio | `origin` duplicado em Appointments (já existe em Patients) | Agendamentos |
| 4 | Médio | Tabela `feedbacks` existe mas nunca é usada | Banco/Tipos |
| 5 | Médio | `averageRating` em Professionals nunca é calculado | Profissionais |
| 6 | Médio | Tipos `feedback` e `lembrete_feedback` definidos mas sem gatilho | Notificações |
| 7 | Leve | `lembrete_prontuario` verifica campo errado (appointment vs session) | Notificações |
| 8 | Leve | Profissional buscado por nome hardcoded, quebrável | Agendamentos |
