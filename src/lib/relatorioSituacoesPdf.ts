import { jsPDF } from "jspdf";
import type { Agente } from "./notificacaoPdf";
import { previewPdf, logoFmt, type Logo } from "./pdfPreview";

const W = 210, M = 20, CW = W - M * 2;
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

export type SituacaoSecao = {
  titulo: string;
  base?: string;
  itens: { banca: string; nome: string; detalhe?: string }[];
};

function dataExtenso(d = new Date()) { return `Santa Maria, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; }
function portaria(a?: Agente | null) {
  if (!a?.portaria_numero) return "";
  const dt = a.portaria_data ? new Date(a.portaria_data + "T00:00:00").toLocaleDateString("pt-BR") : "";
  return `Portaria nº ${a.portaria_numero}${dt ? `, de ${dt}` : ""}`;
}
function cabecalho(doc: jsPDF, logo?: Logo | null): number {
  let y = 14;
  if (logo) { const w = 22, h = (w * logo.h) / logo.w; doc.addImage(logo.dataUrl, logoFmt(logo), W / 2 - w / 2, y, w, h); y += h + 2; }
  doc.setFont("times", "bold").setFontSize(11).setTextColor(20, 20, 40);
  ["ESTADO DO RIO GRANDE DO SUL", "PREFEITURA MUNICIPAL DE SANTA MARIA"].forEach((l) => { doc.text(l, W / 2, y, { align: "center" }); y += 5; });
  doc.setFont("times", "normal").setFontSize(10);
  ["Secretaria de Desenvolvimento Econômico e Inovação", "Gestão do Shopping Independência"].forEach((l) => { doc.text(l, W / 2, y, { align: "center" }); y += 4.6; });
  y += 2; doc.setDrawColor(120, 120, 140).setLineWidth(0.3); doc.line(M, y, W - M, y);
  return y + 9;
}
function assinaturas(doc: jsPDF, y: number, gestor?: Agente | null, secretario?: Agente | null) {
  const colW = CW / 2;
  [{ t: "Gestor(a) do Shopping Independência", a: gestor }, { t: "Secretário(a) de Desenvolvimento Econômico e Inovação", a: secretario }].forEach((b, i) => {
    const cx = M + colW * i + colW / 2;
    doc.setDrawColor(0, 0, 0).setLineWidth(0.3); doc.line(cx - 32, y, cx + 32, y);
    doc.setFont("times", "bold").setFontSize(10).setTextColor(0, 0, 0); doc.text(b.a?.nome || "_________________________", cx, y + 5, { align: "center" });
    doc.setFont("times", "normal").setFontSize(9).setTextColor(60, 60, 60); doc.text(b.a?.cargo || b.t, cx, y + 9.5, { align: "center", maxWidth: colW - 6 });
    const p = portaria(b.a); if (p) doc.text(p, cx, y + 14, { align: "center" });
  });
}

export function gerarRelatorioSituacoes(opts: { secoes: SituacaoSecao[]; titulo?: string; arquivo?: string; gestor?: Agente | null; secretario?: Agente | null; logo?: Logo | null }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabecalho(doc, opts.logo);

  doc.setFont("times", "bold").setFontSize(13).setTextColor(0, 0, 0);
  doc.text(opts.titulo ?? "RELATÓRIO NOMINAL DE SITUAÇÕES — SHOPPING INDEPENDÊNCIA", W / 2, y, { align: "center" }); y += 6;
  doc.setFont("times", "normal").setFontSize(9.5).setTextColor(90, 90, 90);
  doc.text(dataExtenso(), W / 2, y, { align: "center" }); y += 9;

  const cols = [{ x: M, w: 18 }, { x: M + 18, w: 96 }, { x: M + 114, w: 56 }];

  opts.secoes.forEach((sec) => {
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFont("times", "bold").setFontSize(11.5).setTextColor(61, 26, 91);
    doc.text(`${sec.titulo} (${sec.itens.length})`, M, y); y += 5;
    if (sec.base) { doc.setFont("times", "italic").setFontSize(8.5).setTextColor(110, 110, 110); doc.text(sec.base, M, y); y += 4; }

    // header
    doc.setFillColor(31, 56, 100); doc.rect(M, y, CW, 6, "F");
    doc.setFont("times", "bold").setFontSize(8.5).setTextColor(255, 255, 255);
    doc.text("Banca", cols[0].x + 1, y + 4); doc.text("Permissionário", cols[1].x + 1, y + 4); doc.text("Observação", cols[2].x + 1, y + 4);
    y += 6;

    if (sec.itens.length === 0) {
      doc.setFont("times", "italic").setFontSize(9).setTextColor(120, 120, 120); doc.text("Nenhum registro nesta situação.", M + 2, y + 4); y += 8;
    } else {
      sec.itens.forEach((it, i) => {
        if (y > 264) { doc.addPage(); y = 18; }
        if (i % 2) { doc.setFillColor(244, 240, 250); doc.rect(M, y, CW, 6, "F"); }
        doc.setFont("times", "normal").setFontSize(9).setTextColor(20, 20, 20);
        doc.text(String(it.banca), cols[0].x + 1, y + 4);
        doc.text(doc.splitTextToSize(it.nome, cols[1].w - 2)[0], cols[1].x + 1, y + 4);
        if (it.detalhe) doc.text(doc.splitTextToSize(it.detalhe, cols[2].w - 2)[0], cols[2].x + 1, y + 4);
        y += 6;
      });
    }
    y += 6;
  });

  assinaturas(doc, Math.max(y + 10, 252), opts.gestor, opts.secretario);
  previewPdf(doc, `${opts.arquivo ?? "Relatorio_Situacoes"}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
