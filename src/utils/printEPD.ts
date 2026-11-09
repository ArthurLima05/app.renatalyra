import type { Patient } from "@/types";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const DAYS = [1, 2, 3, 4, 5, 6];

const CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Arial',sans-serif;font-size:12px;color:#1a1a1a;background:#fff}
  @page{size:A4;margin:0}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .print-bar{display:none!important}
  }
  .print-bar{display:flex;justify-content:flex-end;padding:8px 12px;background:#f8f8f8;border-bottom:1px solid #ddd;gap:8px}
  .btn-print{padding:6px 18px;background:#1a1a1a;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif}
  .btn-print:hover{background:#333}
  .btn-close{padding:6px 14px;background:#fff;color:#555;border:1px solid #ccc;border-radius:6px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif}
  .page{width:210mm;height:296mm;margin:0 auto;padding:9mm 11mm;display:flex;flex-direction:column}
  .header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding-bottom:6px;border-bottom:2.5px solid #c8a84b;margin-bottom:8px;flex-shrink:0}
  .logo{height:56px;max-width:200px;object-fit:contain;object-position:left center}
  .h-title{text-align:center;font-size:22px;font-weight:700;letter-spacing:.2em;padding-left:.2em}
  .patient{display:flex;align-items:flex-end;gap:8px;border:1.2px solid #333;padding:6px 8px;margin-bottom:8px;flex-shrink:0}
  .patient .lbl{font-size:11px;font-weight:700;letter-spacing:.06em}
  .patient .name{flex:1;min-height:16px;border-bottom:1px solid #333;font-size:13px;padding-bottom:1px}
  .grid{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:8px}
  .day{border:1.2px solid #333;display:flex;flex-direction:column;min-height:0}
  .day-title{text-align:center;font-weight:700;font-size:12px;letter-spacing:.1em;padding:3px 0;background:#f5efe0;border-bottom:1.2px solid #333}
  .day-body{flex:1;display:flex;flex-direction:column;padding:6px 8px 6px;min-height:0}
  .date-row{font-size:10px;color:#555;text-align:right}
  .field{display:flex;align-items:flex-end;gap:6px;margin-top:9px}
  .lbl{font-size:10.5px;font-weight:700;letter-spacing:.06em}
  .line{flex:1;border-bottom:1px solid #333;height:14px}
  .sono{margin-top:11px}
  .opts{display:flex;gap:12px;margin-top:4px;font-size:11px;white-space:nowrap}
  .obs{margin-top:11px}
  .obs-area{flex:1;min-height:0;margin-top:2px;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 17px,#bbb 17px,#bbb 18px)}
`;

const dayBox = (n: number) => `
  <div class="day">
    <div class="day-title">DIA ${n}</div>
    <div class="day-body">
      <div class="date-row">Data: ____ / ____ / ________</div>
      <div class="field"><span class="lbl">DORMIU</span><span class="line"></span></div>
      <div class="field"><span class="lbl">ACORDOU</span><span class="line"></span></div>
      <div class="lbl sono">SONO</div>
      <div class="opts">
        <span>(&nbsp;&nbsp;&nbsp;) BOM</span>
        <span>(&nbsp;&nbsp;&nbsp;) REGULAR</span>
        <span>(&nbsp;&nbsp;&nbsp;) RUIM</span>
      </div>
      <div class="lbl obs">OBSERVAÇÕES</div>
      <div class="obs-area"></div>
    </div>
  </div>`;

// Ficha EPD: diário de 6 dias para o paciente preencher em casa (horário em que
// dormiu e acordou e qualidade do sono). Sai em branco, só com o nome do paciente.
export function generateEpdHtml(params: { patient: Patient; logoSrc: string }): string {
  const { patient, logoSrc } = params;
  const name = escapeHtml(patient.fullName);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>EPD – ${name}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="print-bar">
    <button class="btn-close" onclick="window.close()">Fechar</button>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
  </div>
  <div class="page">
    <div class="header">
      <img class="logo" src="${logoSrc}" alt="Logo" onerror="this.style.display='none'"/>
      <div class="h-title">EPD</div>
      <div></div>
    </div>

    <div class="patient">
      <span class="lbl">PACIENTE:</span>
      <span class="name">${name}</span>
    </div>

    <div class="grid">
      ${DAYS.map(dayBox).join("")}
    </div>
  </div>

  <script>
    window.onafterprint = () => window.close();
  </script>
</body>
</html>`;
}
