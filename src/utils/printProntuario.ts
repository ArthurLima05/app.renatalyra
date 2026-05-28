import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Patient, AnamneseResponse, AnamneseQuestion } from "@/types";

const ML: Record<string, string> = {
  casado: "Casado(a)", solteiro: "Solteiro(a)", divorciado: "Divorciado(a)", viuvo: "Viúvo(a)",
};

// ── SVG do odontograma (diagrama estático para marcação manual) ────────────────

function buildOdontogramSvg(): string {
  const H = 10, C = 4;       // dente permanente: half-size, center-half
  const DH = 7, DC = 3;      // dente decíduo
  const CX = 280;             // centro X do SVG
  const S = 23, DS = 16;     // step permanente / decíduo

  const pg = 12; // gap do centro ao centro do dente 11/21/41/31
  const dg = 9;  // gap do centro ao centro do dente 51/61/81/71 (mín = DH+2 para não cruzar a linha central)

  // Posições X (permanentes)
  const xP = (n: number) => CX - pg - (n - 1) * S; // quadrante direito (11→18)
  const xPL = (n: number) => CX + pg + (n - 1) * S; // quadrante esquerdo (21→28)

  // Posições X (decíduos)
  const xD = (n: number) => CX - dg - (n - 1) * DS; // 51→55
  const xDL = (n: number) => CX + dg + (n - 1) * DS; // 61→65

  // Gera um dente como string SVG
  const tooth = (
    cx: number, cy: number,
    h: number, c: number,
    num: number, numY: number,
  ) =>
    `<polygon points="${cx},${cy - h} ${cx + h},${cy} ${cx},${cy + h} ${cx - h},${cy}" stroke="#2e2e2e" fill="white" stroke-width="0.85"/>` +
    `<rect x="${cx - c}" y="${cy - c}" width="${c * 2}" height="${c * 2}" stroke="#2e2e2e" fill="white" stroke-width="0.7"/>` +
    `<text x="${cx}" y="${numY}" text-anchor="middle" font-size="7" fill="#1a1a1a" font-family="Arial,sans-serif">${num}</text>`;

  // Y para permanentes superiores (números acima)
  const YUP = 23, YUP_N = 10;
  // Y para decíduos superiores (números acima)
  const YUDEC = 51, YUDEC_N = 41;
  // Y para decíduos inferiores (números abaixo)
  const YLDEC = 72, YLDEC_N = 86;
  // Y para permanentes inferiores (números abaixo)
  const YLP = 100, YLP_N = 116;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 128" style="display:block;width:100%;height:auto">`;

  // Linhas centrais (guia)
  s += `<line x1="${CX}" y1="4" x2="${CX}" y2="124" stroke="#ccc" stroke-width="0.5" stroke-dasharray="2,2"/>`;
  s += `<line x1="90" y1="62" x2="470" y2="62" stroke="#ccc" stroke-width="0.5" stroke-dasharray="2,2"/>`;

  // ── Permanentes superiores
  for (let i = 1; i <= 8; i++) {
    s += tooth(xP(i), YUP, H, C, 10 + i, YUP_N);   // 11..18
    s += tooth(xPL(i), YUP, H, C, 20 + i, YUP_N);   // 21..28
  }

  // ── Decíduos superiores
  for (let i = 1; i <= 5; i++) {
    s += tooth(xD(i), YUDEC, DH, DC, 50 + i, YUDEC_N);  // 51..55
    s += tooth(xDL(i), YUDEC, DH, DC, 60 + i, YUDEC_N); // 61..65
  }

  // ── Decíduos inferiores
  for (let i = 1; i <= 5; i++) {
    s += tooth(xD(i), YLDEC, DH, DC, 80 + i, YLDEC_N);  // 81..85
    s += tooth(xDL(i), YLDEC, DH, DC, 70 + i, YLDEC_N); // 71..75
  }

  // ── Permanentes inferiores
  for (let i = 1; i <= 8; i++) {
    s += tooth(xP(i), YLP, H, C, 40 + i, YLP_N);   // 41..48
    s += tooth(xPL(i), YLP, H, C, 30 + i, YLP_N);  // 31..38
  }

  s += `</svg>`;
  return s;
}

// ── Legenda do odontograma ─────────────────────────────────────────────────────

const LEGEND = [
  { label: "Cariado",                color: "#1a1a1a" },
  { label: "Mancha Branca Ativa",    color: "#fca5a5" },
  { label: "Restauração Fraturada",  color: "#fb923c" },
  { label: "Restaurado",             color: "#93c5fd" },
  { label: "Rígido",                 color: "#a3a3a3" },
  { label: "Prótese Fixa",           color: "#1e40af" },
  { label: "Restauração Provisória", color: "#fde047" },
  { label: "Endodontia",             color: "#ef4444" },
];

// ── Geração da Ficha Odontológica ─────────────────────────────────────────────

export function generateFichaOdontologicaHtml(params: {
  patient: Patient;
  anamnese: AnamneseResponse | undefined;
  anamneseQuestions: AnamneseQuestion[];
  logoSrc: string;
  simboloSrc: string;
}): string {
  const { patient, anamnese, anamneseQuestions, logoSrc, simboloSrc } = params;

  const birthStr = patient.birthDate
    ? format(new Date(patient.birthDate), "dd/MM/yyyy", { locale: ptBR })
    : "";
  const isFem = patient.gender === "feminino";
  const isMasc = patient.gender === "masculino";

  // Checkbox inline: pré-marcado ou vazio
  const chk = (v: boolean | null | undefined) =>
    v === true
      ? "(<b>X</b>)&nbsp;SIM &nbsp;&nbsp; (&nbsp;&nbsp;&nbsp;)&nbsp;NÃO"
      : v === false
      ? "(&nbsp;&nbsp;&nbsp;)&nbsp;SIM &nbsp;&nbsp; (<b>X</b>)&nbsp;NÃO"
      : "(&nbsp;&nbsp;&nbsp;)&nbsp;SIM &nbsp;&nbsp; (&nbsp;&nbsp;&nbsp;)&nbsp;NÃO";

  // Mapa de respostas da anamnese digital
  const aMap = new Map<string, { bool?: boolean | null; text?: string }>();
  if (anamnese) {
    for (const a of anamnese.answers) {
      const key = a.questionId ?? a.questionText;
      aMap.set(key, { bool: a.answerBool, text: a.answerText });
    }
  }

  // Perguntas ativas do sistema (até 14, do tipo sim_nao)
  const activeQ = [...anamneseQuestions]
    .filter((q) => q.active)
    .sort((a, b) => a.sequence - b.sequence);

  const qRows = activeQ.map((q, i) => {
    const ans = aMap.get(q.id) ?? aMap.get(q.question);
    const needsQual = q.type === "sim_nao" && (ans?.bool === true || ans?.bool == null);
    const qualText = ans?.text ?? "";
    const qualLine = needsQual
      ? `&nbsp;&nbsp;QUAL?&nbsp;<span style="display:inline-block;min-width:120px;border-bottom:1px solid #555;font-size:9px">${qualText}</span>`
      : "";

    if (q.type === "sim_nao") {
      return `<tr>
        <td class="qn">${i + 1}.</td>
        <td class="qt">${q.question}</td>
        <td class="qa">${chk(ans?.bool)}${qualLine}</td>
      </tr>`;
    } else {
      return `<tr>
        <td class="qn">${i + 1}.</td>
        <td class="qt" colspan="2">${q.question}&nbsp;
          <span style="display:inline-block;flex:1;min-width:200px;border-bottom:1px solid #555">${ans?.text ?? ""}</span>
        </td>
      </tr>`;
    }
  }).join("");

  const nextNum = activeQ.length + 1;

  // Perguntas 15–16 fixas (higiene e hábitos)
  const box = (label: string) =>
    `<span style="white-space:nowrap;margin-right:8px">(&nbsp;&nbsp;)&nbsp;${label}</span>`;

  const q15Row = `<tr>
    <td class="qn">${nextNum}.</td>
    <td class="qt" colspan="2" style="padding-bottom:4px">
      <span style="font-weight:600">HIGIENE BUCAL UTILIZA:</span><br>
      <div style="display:flex;flex-wrap:wrap;gap:1px 0;margin-top:3px;font-size:9px">
        ${box("Fio")}${box("Fita Dental")}${box("Interdental")}${box("Escova Macia")}${box("Escova Média")}${box("Escova Dura")}${box("Unitufos / Bitufos")}${box("Palito")}${box("Creme Dental")}${box("Enxaguante Bucal")}
      </div>
    </td>
  </tr>`;

  const q16Row = `<tr>
    <td class="qn">${nextNum + 1}.</td>
    <td class="qt" colspan="2" style="padding-bottom:4px">
      <span style="font-weight:600">HÁBITOS:</span><br>
      <div style="display:flex;flex-wrap:wrap;gap:1px 0;margin-top:3px;font-size:9px">
        ${box("Roer unhas")}${box("Respirar pela boca")}${box("Chupar dedo")}${box("Morder caneta / lápis")}${box("Ranger dentes (dia)")}${box("Ranger dentes (noite)")}${box("Outros")}
      </div>
    </td>
  </tr>`;

  // Legenda do odontograma
  const legendHtml = LEGEND.map(
    (l) =>
      `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px">` +
      `<span style="display:inline-block;width:10px;height:10px;background:${l.color};border:1px solid #999;flex-shrink:0"></span>` +
      `<span style="font-size:8.5px">${l.label}</span></span>`,
  ).join("");

  // Linha de campo (label + valor sublinhado)
  const fld = (lbl: string, val: string, w = "auto") =>
    `<div style="display:flex;flex-direction:column;flex:${w === "auto" ? "1" : "0 0 " + w}">` +
    `<span style="font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#777">${lbl}</span>` +
    `<span style="border-bottom:1px solid #333;min-height:16px;font-size:10.5px;padding-bottom:1px">${val}</span></div>`;

  const gap = `<div style="width:10px;flex-shrink:0"></div>`;

  const css = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Arial',sans-serif;font-size:11px;color:#1a1a1a;background:#fff}
    @page{size:A4;margin:0}
    @media print{
      body{padding:9mm 11mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .print-bar{display:none!important}
    }
    .header{display:flex;align-items:center;padding-bottom:7px;border-bottom:2.5px solid #c8a84b;margin-bottom:9px}
    .logo{height:44px;object-fit:contain;max-width:150px;flex-shrink:0}
    .h-title{flex:1;text-align:center;font-size:13px;font-weight:700;letter-spacing:.05em;line-height:1.4}
    .h-title-sub{font-size:10.5px;font-weight:400;letter-spacing:.02em;margin-top:2px}
    .logo-spacer{width:150px;flex-shrink:0}
    .data-row{display:flex;gap:0;margin-bottom:5px;align-items:flex-end}
    .sec{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#c8a84b;margin:9px 0 5px;padding-bottom:2px;border-bottom:1px solid #e8dfc8}
    .odonto-box{border:1px solid #ddd;border-radius:4px;padding:7px 8px 5px;margin-bottom:5px}
    table.qt-tbl{width:100%;border-collapse:collapse;font-size:10.5px}
    table.qt-tbl tr{border-bottom:1px dotted #ddd}
    table.qt-tbl td{padding:2px 4px;vertical-align:top;line-height:1.3}
    td.qn{width:18px;color:#888;font-weight:600;white-space:nowrap;vertical-align:top}
    td.qt{line-height:1.3}
    td.qa{white-space:nowrap;text-align:right;font-size:10px;vertical-align:top}
    .auth{font-size:8.5px;text-align:center;font-style:italic;margin:10px 0 12px;color:#333;line-height:1.5}
    .sig-row{display:flex;gap:16px;margin-top:8px}
    .sig-box{flex:1;text-align:center}
    .sig-line{border-top:1px solid #1a1a1a;padding-top:4px;font-size:8.5px;color:#555;margin-top:26px}
    .wm{position:fixed;bottom:-40px;right:-40px;width:480px;height:480px;opacity:.10;pointer-events:none;z-index:0}
    .wm img{width:100%;height:100%;object-fit:contain}
    .print-bar{display:flex;justify-content:flex-end;padding:8px 12px;background:#f8f8f8;border-bottom:1px solid #ddd;gap:8px}
    .btn-print{padding:6px 18px;background:#1a1a1a;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif}
    .btn-print:hover{background:#333}
    .btn-close{padding:6px 14px;background:#fff;color:#555;border:1px solid #ccc;border-radius:6px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif}
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Prontuário – ${patient.fullName}</title>
  <style>${css}</style>
</head>
<body>
  <div class="print-bar">
    <button class="btn-close" onclick="window.close()">Fechar</button>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
  </div>
  <div style="padding:0 0" class="page-content">
  <div class="wm"><img src="${simboloSrc}" alt=""/></div>

  <!-- CABEÇALHO -->
  <div class="header">
    <img class="logo" src="${logoSrc}" alt="Logo" onerror="this.style.display='none'"/>
    <div class="h-title">PRONTUÁRIO ODONTOLÓGICO</div>
    <div class="logo-spacer"></div>
  </div>

  <!-- DADOS DO PACIENTE -->
  <div class="data-row">
    ${fld("Nome do Paciente", patient.fullName)}
    ${gap}
    ${fld("Prontuário", "", "80px")}
  </div>

  <div class="data-row">
    ${fld("Nome do Responsável", patient.responsible ?? "")}
    ${gap}
    ${fld("CPF do Responsável", patient.responsibleCpf ?? "", "130px")}
  </div>

  <div class="data-row">
    ${fld("Endereço", patient.address ?? "")}
  </div>

  <div class="data-row">
    ${fld("Data de Nascimento", birthStr, "110px")}
    ${gap}
    <div style="display:flex;flex-direction:column;flex-shrink:0">
      <span style="font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#777">Sexo</span>
      <span style="border-bottom:1px solid #333;min-height:16px;font-size:10px;padding-bottom:1px;white-space:nowrap">
        F&nbsp;(${isFem ? "&nbsp;X&nbsp;" : "&nbsp;&nbsp;&nbsp;"})&nbsp; M&nbsp;(${isMasc ? "&nbsp;X&nbsp;" : "&nbsp;&nbsp;&nbsp;"})
      </span>
    </div>
    ${gap}
    ${fld("Telefone", patient.phone, "120px")}
  </div>

  <div class="data-row">
    ${fld("Indicado por", patient.origin)}
    ${gap}
    ${fld("Profissão", patient.profession ?? "")}
    ${gap}
    ${fld("Estado Civil", patient.maritalStatus ? (ML[patient.maritalStatus] ?? patient.maritalStatus) : "", "100px")}
  </div>

  <div class="data-row">
    ${fld("E-mail", patient.email ?? "")}
    ${gap}
    ${fld("Queixa Principal", patient.notes ?? "")}
  </div>

  <!-- HISTÓRICO -->
  <div class="data-row" style="margin-top:2px">
    ${fld("Histórico do Paciente", "")}
  </div>

  <!-- ODONTOGRAMA -->
  <div class="sec">Odontograma</div>
  <div class="odonto-box">
    ${buildOdontogramSvg()}
    <div style="display:flex;flex-wrap:wrap;margin-top:6px;gap:2px 0">${legendHtml}</div>
  </div>

  <!-- QUESTIONÁRIO -->
  <div class="sec">Questionário de Saúde</div>
  <table class="qt-tbl">
    <tbody>
      ${qRows}
      ${q15Row}
      ${q16Row}
    </tbody>
  </table>

  <!-- AUTORIZAÇÃO -->
  <p class="auth">
    Assumo inteira responsabilidade pelas informações aqui prestadas, bem como autorizo o(s) profissional(is)
    a realizar(em) todos os procedimentos necessários ao meu tratamento.
  </p>

  <!-- ASSINATURAS -->
  <div class="sig-row">
    <div class="sig-box"><div class="sig-line">Assinatura do Dentista / Carimbo CRO</div></div>
    <div class="sig-box"><div class="sig-line">Assinatura do Paciente</div></div>
    <div class="sig-box"><div class="sig-line">Data: _____ / _____ / _________</div></div>
  </div>

  </div>

  <script>
    try { history.replaceState(null, '', '/prontuario'); } catch(e) {}
    window.onafterprint = () => window.close();
  <\/script>
</body>
</html>`;
}
