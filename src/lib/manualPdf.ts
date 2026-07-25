import { jsPDF } from "jspdf";
import { previewPdf, logoFmt, type Logo } from "./pdfPreview";
import { MANUAL, MANUAL_VERSAO } from "./manualConteudo";

const W = 210, H = 297, M = 20, CW = W - M * 2;
const BRAND: [number, number, number] = [61, 26, 91];
const ACCENT: [number, number, number] = [138, 43, 174];
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

export function gerarManualPDF(opts: { logo?: Logo | null }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const hoje = new Date();

  // ---------- Capa ----------
  doc.setFillColor(...BRAND); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...ACCENT); doc.rect(0, 150, W, 3, "F");
  if (opts.logo) {
    const w = 34, h = (w * opts.logo.h) / opts.logo.w;
    try { doc.addImage(opts.logo.dataUrl, logoFmt(opts.logo), W / 2 - w / 2, 42, w, h); } catch { /* logo opcional */ }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("times", "bold").setFontSize(13); doc.text("PREFEITURA MUNICIPAL DE SANTA MARIA", W / 2, 100, { align: "center" });
  doc.setFont("times", "normal").setFontSize(11); doc.text("Secretaria de Desenvolvimento Econômico e Inovação", W / 2, 107, { align: "center" });
  doc.setFont("times", "bold").setFontSize(26); doc.text("Manual de Uso", W / 2, 128, { align: "center" });
  doc.setFontSize(15).setFont("times", "normal"); doc.text("Plataforma de Gestão do Shopping Independência", W / 2, 140, { align: "center", maxWidth: CW });
  doc.setFontSize(11).setTextColor(220, 208, 235);
  doc.text("Guia de capacitação da equipe", W / 2, 168, { align: "center" });
  doc.text(`Versão ${MANUAL_VERSAO} · ${hoje.getDate()} de ${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`, W / 2, 176, { align: "center" });
  doc.setFontSize(9).setTextColor(200, 188, 220);
  doc.text("Praça Saldanha Marinho · Centro · Santa Maria/RS — www.santamaria.rs.gov.br", W / 2, 285, { align: "center" });

  // ---------- Sumário ----------
  doc.addPage();
  let y = cabecalhoInterno(doc);
  doc.setFont("times", "bold").setFontSize(16).setTextColor(...BRAND); doc.text("Sumário", M, y); y += 10;
  doc.setFontSize(11);
  MANUAL.forEach((s) => {
    doc.setFont("times", "bold").setTextColor(...ACCENT); doc.text(`${s.n}.`, M, y);
    doc.setFont("times", "normal").setTextColor(40, 40, 40); doc.text(s.titulo, M + 8, y);
    y += 7;
  });

  // ---------- Seções ----------
  doc.addPage();
  y = cabecalhoInterno(doc);
  MANUAL.forEach((s) => {
    const alturaIntro = s.intro ? (doc.splitTextToSize(s.intro, CW).length * 5.4 + 4) : 0;
    if (y + 16 + alturaIntro > H - 20) { doc.addPage(); y = cabecalhoInterno(doc); }
    // título da seção
    doc.setFillColor(...BRAND); doc.rect(M, y - 4.5, 3, 7, "F");
    doc.setFont("times", "bold").setFontSize(14).setTextColor(...BRAND);
    doc.text(`${s.n}. ${s.titulo}`, M + 6, y + 1); y += 9;
    if (s.intro) {
      doc.setFont("times", "normal").setFontSize(10.5).setTextColor(45, 45, 45);
      const linhas = doc.splitTextToSize(s.intro, CW) as string[];
      doc.text(linhas, M, y, { lineHeightFactor: 1.45 }); y += linhas.length * 5.4 + 3;
    }
    (s.passos ?? []).forEach((p) => {
      const linhas = doc.splitTextToSize(p, CW - 6) as string[];
      if (y + linhas.length * 5.2 > H - 18) { doc.addPage(); y = cabecalhoInterno(doc); }
      doc.setFillColor(...ACCENT); doc.circle(M + 1.4, y - 1.2, 1, "F");
      doc.setFont("times", "normal").setFontSize(10.5).setTextColor(30, 30, 30);
      doc.text(linhas, M + 6, y, { lineHeightFactor: 1.4 }); y += linhas.length * 5.2 + 1.5;
    });
    y += 5;
  });

  // rodapé com paginação
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("times", "normal").setFontSize(8).setTextColor(150, 150, 150);
    doc.text(`Manual de Uso — Shopping Independência · pág. ${i - 1}`, W / 2, H - 8, { align: "center" });
  }

  previewPdf(doc, `Manual_Plataforma_Shopping_Independencia_v${MANUAL_VERSAO}.pdf`);
}

function cabecalhoInterno(doc: jsPDF): number {
  doc.setFillColor(...BRAND); doc.rect(0, 0, W, 12, "F");
  doc.setFont("times", "bold").setFontSize(9).setTextColor(255, 255, 255);
  doc.text("MANUAL DE USO · PLATAFORMA DE GESTÃO DO SHOPPING INDEPENDÊNCIA", M, 8);
  return 24;
}
