import LightLogoRaw from "@/assets/LightLogo.svg?raw";
import SimboloDouradoRaw from "@/assets/SimboloDourado.svg?raw";

// Papel timbrado A4 da Dra. Renata Lyra: logo centralizada no topo com o CRO abaixo,
// marca d'água (símbolo) com transparência ao fundo e endereço/contatos no rodapé.
// O corpo da folha é editável na tela antes de imprimir.

const CLINIC = {
  cro: "CRO 7985 - PE",
  addressLine: "Rua Dr. Raul Lafayette 191, sala 202, Empresarial Universal Center, Boa Viagem",
  contactLine: "Fone: (81) 3326-6446 . (81) 9 8624-3197 / drarenatalyra@gmail.com / @renatalyra",
};

const cleanSvg = (raw: string) =>
  raw
    .replace(/^<\?xml[^?]*\?>\s*/i, "")
    .replace(/<!DOCTYPE[^>]*>\s*/gi, "")
    .trim();

// Pré-computado uma vez (encodeURIComponent em ~280KB é lento se feito a cada clique)
const LOGO_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg(LightLogoRaw))}`;
const SYMBOL_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg(SimboloDouradoRaw))}`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function generatePapelTimbradoHtml(params: { patientName?: string } = {}): string {
  const patientLine = params.patientName
    ? `<p><strong>Paciente:</strong> ${esc(params.patientName)}</p>`
    : "";

  const css = `
    @page { size: A4 portrait; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #e9e9e9; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-bar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between;
      align-items: center; gap: 8px; padding: 8px 12px; background: #f8f8f8; border-bottom: 1px solid #ddd; }
    .print-bar .hint { font-size: 12px; color: #666; }
    .print-bar .btns { display: flex; gap: 8px; }
    .btn-print { padding: 6px 18px; background: #1a1a1a; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
    .btn-close { padding: 6px 14px; background: #fff; color: #555; border: 1px solid #ccc; border-radius: 6px; font-size: 13px; cursor: pointer; }
    .page { position: relative; width: 210mm; height: 297mm; margin: 12px auto; background: #fff;
      padding: 16mm 24mm 30mm 24mm; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,.15); }
    .header { display: flex; flex-direction: column; align-items: center; }
    .logo { width: 100mm; height: auto; display: block; border: 0; }
    .cro { margin-top: -9mm; font-size: 13pt; font-weight: 600; letter-spacing: .04em; color: #8a8a8a; }
    .watermark { position: absolute; top: 52%; left: 50%; transform: translate(-50%, -50%);
      width: 210mm; height: 225mm; opacity: 0.14; pointer-events: none; z-index: 0; }
    .watermark img { width: 100%; height: 100%; display: block; border: 0; }
    .content { position: relative; z-index: 1; margin-top: 14mm; font-size: 12pt; line-height: 1.7;
      text-align: justify; outline: none; min-height: 150mm; }
    .content p { margin-bottom: 4mm; }
    .footer { position: absolute; bottom: 10mm; left: 10mm; right: 10mm; border-top: 0.5px solid #e6d9c0;
      padding-top: 3mm; text-align: center; font-size: 10.5pt; line-height: 1.5; color: #8a8a8a; z-index: 1; }
    @media screen { .content:hover, .content:focus { background: rgba(200,168,75,.06); } }
    @media print {
      html, body { background: #fff; }
      .print-bar { display: none !important; }
      .page { margin: 0; box-shadow: none; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Papel timbrado – Dra. Renata Lyra</title>
  <style>${css}</style>
</head>
<body>
  <div class="print-bar">
    <span class="hint">Clique no texto da folha para escrever ou editar antes de imprimir.</span>
    <div class="btns">
      <button class="btn-close" onclick="window.close()">Fechar</button>
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
    </div>
  </div>

  <div class="page">
    <div class="header">
      <img class="logo" src="${LOGO_URL}" alt="Renata Lyra"/>
      <div class="cro">${CLINIC.cro}</div>
    </div>
    <div class="watermark"><img src="${SYMBOL_URL}" alt=""/></div>

    <div class="content" contenteditable="true" spellcheck="true">
      ${patientLine}
      <p><br></p>
    </div>

    <div class="footer">
      ${CLINIC.addressLine}<br/>${CLINIC.contactLine}
    </div>
  </div>
</body>
</html>`;
}
