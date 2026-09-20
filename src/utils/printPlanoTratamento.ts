import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Patient, TreatmentPlan } from "@/types";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function generatePlanoTratamentoHtml(params: {
  patient: Patient;
  plan: TreatmentPlan;
  professionalName?: string;
  logoSrc: string;
}): string {
  const { patient, plan, professionalName, logoSrc } = params;

  const items = [...plan.items].sort((a, b) => a.sequence - b.sequence);
  const total = items.reduce((sum, it) => sum + it.quantity * it.unitValue, 0);
  const saldo = total - plan.advanceValue;

  const rows = items.map((it, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${it.description}${it.teeth ? ` <span class="muted">(dente${it.teeth.includes(",") || it.teeth.includes("x") ? "s" : ""} ${it.teeth})</span>` : ""}</td>
      <td class="c">${it.quantity}</td>
      <td class="r">${fmtBRL(it.unitValue)}</td>
      <td class="r">${fmtBRL(it.quantity * it.unitValue)}</td>
    </tr>
  `).join("");

  const css = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Arial',sans-serif;font-size:12px;color:#1a1a1a;background:#fff}
    @page{size:A4;margin:0}
    @media print{
      body{padding:12mm 14mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .print-bar{display:none!important}
    }
    .header{display:flex;align-items:center;padding-bottom:8px;border-bottom:2.5px solid #c8a84b;margin-bottom:12px}
    .logo{height:46px;object-fit:contain;max-width:150px;flex-shrink:0}
    .h-title{flex:1;text-align:center;font-size:16px;font-weight:700;letter-spacing:.05em}
    .logo-spacer{width:150px;flex-shrink:0}
    .data-row{display:flex;gap:24px;margin-bottom:10px}
    .fld{display:flex;flex-direction:column;flex:1}
    .fld span.lbl{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#777}
    .fld span.val{border-bottom:1px solid #333;min-height:16px;font-size:12.5px;padding-bottom:2px}
    table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
    thead td{font-weight:700;text-transform:uppercase;font-size:9.5px;letter-spacing:.05em;color:#c8a84b;border-bottom:1px solid #e8dfc8;padding:4px 6px}
    tbody td{padding:6px;border-bottom:1px dotted #ddd;vertical-align:top}
    td.c{text-align:center}
    td.r{text-align:right;white-space:nowrap}
    .muted{color:#888;font-size:11px}
    .totals{display:flex;justify-content:flex-end;margin-top:10px}
    .totals-box{width:260px}
    .totals-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12.5px}
    .totals-row.total{font-weight:700;font-size:14px;border-top:1.5px solid #1a1a1a;margin-top:4px;padding-top:6px}
    .notes{margin-top:16px;font-size:12px}
    .notes .lbl{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .sig-row{display:flex;gap:20px;margin-top:40px}
    .sig-box{flex:1;text-align:center}
    .sig-line{border-top:1px solid #1a1a1a;padding-top:4px;font-size:10.5px;color:#555}
    .print-bar{display:flex;justify-content:flex-end;padding:8px 12px;background:#f8f8f8;border-bottom:1px solid #ddd;gap:8px}
    .btn-print{padding:6px 18px;background:#1a1a1a;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif}
    .btn-print:hover{background:#333}
    .btn-close{padding:6px 14px;background:#fff;color:#555;border:1px solid #ccc;border-radius:6px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif}
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Plano de Tratamento – ${patient.fullName}</title>
  <style>${css}</style>
</head>
<body>
  <div class="print-bar">
    <button class="btn-close" onclick="window.close()">Fechar</button>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
  </div>

  <div class="header">
    <img class="logo" src="${logoSrc}" alt="Logo" onerror="this.style.display='none'"/>
    <div class="h-title">PLANO DE TRATAMENTO</div>
    <div class="logo-spacer"></div>
  </div>

  <div class="data-row">
    <div class="fld"><span class="lbl">Paciente</span><span class="val">${patient.fullName}</span></div>
    <div class="fld" style="flex:0 0 130px"><span class="lbl">Data</span><span class="val">${format(plan.createdAt, "dd/MM/yyyy", { locale: ptBR })}</span></div>
  </div>

  <div class="data-row">
    <div class="fld"><span class="lbl">Plano</span><span class="val">${plan.title}</span></div>
    <div class="fld" style="flex:0 0 200px"><span class="lbl">Profissional</span><span class="val">${professionalName ?? ""}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <td class="c" style="width:30px">#</td>
        <td>Descrição</td>
        <td class="c" style="width:50px">Qtd.</td>
        <td class="r" style="width:110px">Valor Unit.</td>
        <td class="r" style="width:110px">Total</td>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="5" class="c muted" style="padding:16px">Nenhum item cadastrado</td></tr>`}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row total"><span>Total</span><span>${fmtBRL(total)}</span></div>
      <div class="totals-row"><span>Entrada / À vista</span><span>${fmtBRL(plan.advanceValue)}</span></div>
      <div class="totals-row"><span>Saldo</span><span>${fmtBRL(saldo)}</span></div>
    </div>
  </div>

  ${plan.notes ? `<div class="notes"><div class="lbl">Observações</div><div>${plan.notes.replace(/\n/g, "<br>")}</div></div>` : ""}

  <div class="sig-row">
    <div class="sig-box"><div class="sig-line">Assinatura do Dentista / Carimbo CRO</div></div>
    <div class="sig-box"><div class="sig-line">Assinatura do Paciente</div></div>
  </div>

  <script>
    window.onafterprint = () => window.close();
  <\/script>
</body>
</html>`;
}
