import { jsPDF } from "jspdf";
import type { Agente } from "./notificacaoPdf";
import { previewPdf, logoFmt, type Logo } from "./pdfPreview";

const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export type GrupoInad = {
  numero: string;
  nome: string | null;
  cotas: number;
  total: number;
  nivel: "verde" | "amarelo" | "vermelho" | "preto";
  nivelLabel: string;
};
export type Resumo = { bancas: number; total: number; risco: number };

function dataExtenso(d = new Date()) {
  return `Santa Maria, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
function portaria(a?: Agente | null) {
  if (!a?.portaria_numero) return "";
  const dt = a.portaria_data ? new Date(a.portaria_data + "T00:00:00").toLocaleDateString("pt-BR") : "";
  return `Portaria nº ${a.portaria_numero}${dt ? `, de ${dt}` : ""}`;
}

const W = 210, M = 20, CW = W - M * 2;

function cabecalho(doc: jsPDF, logo?: Logo | null): number {
  let y = 14;
  if (logo) {
    const wmm = 22;
    const hmm = (wmm * logo.h) / logo.w;
    doc.addImage(logo.dataUrl, logoFmt(logo), W / 2 - wmm / 2, y, wmm, hmm);
    y += hmm + 2;
  }
  doc.setFont("times", "bold").setFontSize(11).setTextColor(20, 20, 40);
  ["ESTADO DO RIO GRANDE DO SUL", "PREFEITURA MUNICIPAL DE SANTA MARIA"].forEach((l) => {
    doc.text(l, W / 2, y, { align: "center" }); y += 5;
  });
  doc.setFont("times", "normal").setFontSize(10);
  ["Secretaria de Desenvolvimento Econômico e Inovação", "Gestão do Shopping Independência"].forEach((l) => {
    doc.text(l, W / 2, y, { align: "center" }); y += 4.6;
  });
  y += 2;
  doc.setDrawColor(120, 120, 140).setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  return y + 10;
}

function assinaturas(doc: jsPDF, y: number, gestor?: Agente | null, secretario?: Agente | null) {
  const colW = CW / 2;
  [{ t: "Gestor(a) do Shopping Independência", a: gestor },
   { t: "Secretário(a) de Desenvolvimento Econômico e Inovação", a: secretario }].forEach((b, i) => {
    const cx = M + colW * i + colW / 2;
    doc.setDrawColor(0, 0, 0).setLineWidth(0.3);
    doc.line(cx - 32, y, cx + 32, y);
    doc.setFont("times", "bold").setFontSize(10).setTextColor(0, 0, 0);
    doc.text(b.a?.nome || "_________________________", cx, y + 5, { align: "center" });
    doc.setFont("times", "normal").setFontSize(9).setTextColor(60, 60, 60);
    doc.text(b.a?.cargo || b.t, cx, y + 9.5, { align: "center", maxWidth: colW - 6 });
    const p = portaria(b.a);
    if (p) doc.text(p, cx, y + 14, { align: "center" });
  });
}

const CORHEX: Record<string, [number, number, number]> = {
  verde: [46, 139, 87], amarelo: [200, 150, 20], vermelho: [192, 57, 43], preto: [32, 36, 43],
};

// ---------- Relatório panorama ----------
export function gerarRelatorioInadimplencia(opts: {
  resumo: Resumo; grupos: GrupoInad[]; gestor?: Agente | null; secretario?: Agente | null; logo?: Logo | null;
}) {
  const { resumo, grupos } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabecalho(doc, opts.logo);

  doc.setFont("times", "bold").setFontSize(13).setTextColor(0, 0, 0);
  doc.text("RELATÓRIO DE INADIMPLÊNCIA — SHOPPING INDEPENDÊNCIA", W / 2, y, { align: "center" });
  y += 8;
  doc.setFont("times", "normal").setFontSize(10).setTextColor(80, 80, 80);
  doc.text(dataExtenso(), W / 2, y, { align: "center" });
  y += 10;

  // resumo
  doc.setFontSize(10.5).setTextColor(15, 15, 15);
  const linhaResumo = `Bancas inadimplentes: ${resumo.bancas}    |    Total em atraso: ${BRL.format(resumo.total)}    |    Acima de 3 cotas (risco de cassação): ${resumo.risco}`;
  doc.text(linhaResumo, W / 2, y, { align: "center" });
  y += 10;

  // tabela header
  const cols = [
    { t: "Banca", x: M, w: 16 },
    { t: "Permissionário", x: M + 16, w: 68 },
    { t: "Cotas", x: M + 84, w: 16 },
    { t: "Total devido", x: M + 100, w: 28 },
    { t: "Situação", x: M + 128, w: 42 },
  ];
  function headerRow() {
    doc.setFillColor(31, 56, 100);
    doc.rect(M, y, CW, 7, "F");
    doc.setFont("times", "bold").setFontSize(9).setTextColor(255, 255, 255);
    cols.forEach((c) => doc.text(c.t, c.x + 1, y + 4.8));
    y += 7;
  }
  headerRow();
  doc.setFont("times", "normal").setTextColor(20, 20, 20);
  grupos.forEach((g, i) => {
    if (y > 262) { doc.addPage(); y = 18; headerRow(); doc.setFont("times", "normal").setTextColor(20, 20, 20); }
    if (i % 2) { doc.setFillColor(244, 240, 250); doc.rect(M, y, CW, 6.5, "F"); }
    doc.setFontSize(9).setTextColor(20, 20, 20);
    doc.text(String(g.numero), cols[0].x + 1, y + 4.4);
    doc.text(doc.splitTextToSize(g.nome || "—", cols[1].w - 2)[0], cols[1].x + 1, y + 4.4);
    doc.text(String(g.cotas), cols[2].x + 1, y + 4.4);
    doc.text(BRL.format(g.total), cols[3].x + 1, y + 4.4);
    const [r, gr, b] = CORHEX[g.nivel];
    doc.setTextColor(r, gr, b).setFont("times", "bold");
    doc.text(g.nivelLabel, cols[4].x + 1, y + 4.4);
    doc.setFont("times", "normal");
    y += 6.5;
  });

  if (grupos.length === 0) {
    doc.setFontSize(10).setTextColor(90, 90, 90);
    doc.text("Nenhuma inadimplência registrada.", M + 2, y + 6);
    y += 12;
  }

  // legenda semáforo
  y += 8;
  doc.setFont("times", "bold").setFontSize(9).setTextColor(60, 60, 60);
  doc.text("Legenda:", M, y);
  const leg = [["verde", "1 cota"], ["amarelo", "2 cotas"], ["vermelho", "3 cotas"], ["preto", "cassação (+3)"]];
  let lx = M + 18;
  leg.forEach(([nv, lb]) => {
    const [r, g, b] = CORHEX[nv];
    doc.setFillColor(r, g, b); doc.rect(lx, y - 3, 3.5, 3.5, "F");
    doc.setFont("times", "normal").setTextColor(60, 60, 60);
    doc.text(lb, lx + 5, y); lx += 33;
  });

  assinaturas(doc, Math.max(y + 24, 250), opts.gestor, opts.secretario);
  previewPdf(doc, `Relatorio_Inadimplencia_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ---------- Ofício à Administradora solicitando posicionamento ----------
export function gerarOficioPosicionamento(opts: {
  grupos: GrupoInad[]; numeroOficio?: string; gestor?: Agente | null; secretario?: Agente | null; logo?: Logo | null;
}) {
  const { grupos } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabecalho(doc, opts.logo);

  const num = opts.numeroOficio || "____";
  doc.setFont("times", "bold").setFontSize(12).setTextColor(0, 0, 0);
  doc.text(`OFÍCIO Nº ${num}/${new Date().getFullYear()} — SMDE&I`, W / 2, y, { align: "center" });
  y += 10;

  doc.setFont("times", "normal").setFontSize(11).setTextColor(15, 15, 15);
  doc.text("À Empresa Concessionária Administradora do Shopping Independência", M, y); y += 6;
  doc.text("Assunto: Solicitação de posicionamento sobre inadimplência.", M, y); y += 10;

  const totalDev = grupos.reduce((s, g) => s + g.total, 0);
  const paras = [
    `Senhores(as), com fundamento no Decreto Executivo que dispõe sobre as normas de funcionamento do Shopping Independência, em especial o art. 7º (dever de prestar informações) e o art. 14, §3º (providências em caso de inadimplência), solicitamos o posicionamento dessa concessionária quanto às ${grupos.length} banca(s) atualmente em situação de inadimplência, que somam ${BRL.format(totalDev)} em atraso.`,
    `Requer-se a apresentação, no prazo de 10 (dez) dias, das providências de cobrança adotadas — notificações emitidas, protesto de dívida e demais medidas — bem como a documentação comprobatória, para subsídio das eventuais medidas administrativas cabíveis, inclusive a abertura de procedimento de cassação das autorizações cujo atraso ultrapasse 3 (três) cotas.`,
  ];
  paras.forEach((p) => {
    const linhas = doc.splitTextToSize(p, CW) as string[];
    doc.text(linhas, M, y, { align: "justify", maxWidth: CW, lineHeightFactor: 1.5 });
    y += linhas.length * 6.2 + 4;
  });

  // mini-tabela das bancas
  if (grupos.length) {
    y += 2;
    doc.setFont("times", "bold").setFontSize(9.5).setTextColor(40, 40, 40);
    doc.text("Bancas em atraso:", M, y); y += 5;
    doc.setFont("times", "normal").setFontSize(9.5).setTextColor(20, 20, 20);
    grupos.slice(0, 24).forEach((g) => {
      const linha = `• Banca ${g.numero} — ${g.nome || "—"} — ${g.cotas} cota(s) — ${BRL.format(g.total)} (${g.nivelLabel})`;
      const ls = doc.splitTextToSize(linha, CW - 4) as string[];
      if (y + ls.length * 5 > 258) { doc.addPage(); y = 20; }
      doc.text(ls, M + 2, y);
      y += ls.length * 5;
    });
  }

  y += 6;
  doc.setFont("times", "normal").setFontSize(11).setTextColor(15, 15, 15);
  doc.text(dataExtenso(), W - M, y, { align: "right" });
  assinaturas(doc, Math.max(y + 22, 250), opts.gestor, opts.secretario);
  previewPdf(doc, `Oficio_Posicionamento_${num}.pdf`);
}
