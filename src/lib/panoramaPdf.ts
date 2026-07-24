import { jsPDF } from "jspdf";
import type { Agente } from "./notificacaoPdf";
import { previewPdf, logoFmt, type Logo } from "./pdfPreview";

const W = 210, M = 18, CW = W - M * 2;
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NIVEL: Record<string, [number, number, number]> = { baixo: [46,139,87], medio: [200,150,20], alto: [192,57,43], critico: [32,36,43] };

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

function subtitulo(doc: jsPDF, y: number, t: string): number {
  doc.setFont("times", "bold").setFontSize(11.5).setTextColor(61, 26, 91);
  doc.text(t, M, y);
  return y + 5;
}

function metricas(doc: jsPDF, y: number, items: { label: string; value: string; cor: [number, number, number] }[]): number {
  const n = items.length; const bw = CW / n;
  items.forEach((it, i) => {
    const x = M + bw * i;
    doc.setDrawColor(225, 220, 235).setLineWidth(0.3); doc.roundedRect(x + 1, y, bw - 2, 16, 2, 2);
    doc.setFont("times", "bold").setFontSize(15).setTextColor(...it.cor); doc.text(it.value, x + bw / 2, y + 7, { align: "center" });
    doc.setFont("times", "normal").setFontSize(7.5).setTextColor(90, 90, 90);
    doc.text(doc.splitTextToSize(it.label, bw - 4), x + bw / 2, y + 12, { align: "center" });
  });
  return y + 22;
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

export type PanoramaDados = {
  c: Record<string, number>;
  util: { agua: number; energia: number; atraso: number };
  derivados: { t: string; s: string; n: string }[];
  riscos: { titulo: string; nivel: string; origem: string | null }[];
  gestor?: Agente | null; secretario?: Agente | null; logo?: Logo | null;
};

export function gerarPanoramaPDF(d: PanoramaDados) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabecalho(doc, d.logo);

  doc.setFont("times", "bold").setFontSize(13).setTextColor(0, 0, 0);
  doc.text("PANORAMA ESTRATÉGICO — SHOPPING INDEPENDÊNCIA", W / 2, y, { align: "center" }); y += 6;
  doc.setFont("times", "normal").setFontSize(9.5).setTextColor(90, 90, 90);
  doc.text(dataExtenso(), W / 2, y, { align: "center" }); y += 9;

  const g = ([r, gg, b]: number[]) => [r, gg, b] as [number, number, number];

  y = subtitulo(doc, y, "Ocupação e conformidade das bancas");
  y = metricas(doc, y, [
    { label: "ocupadas", value: String(d.c.ocupada ?? 0), cor: g([46,139,87]) },
    { label: "vagas", value: String(d.c.vaga ?? 0), cor: g([110,92,130]) },
    { label: "aguardando sorteio", value: String(d.c.aguardando ?? 0), cor: g([31,155,212]) },
    { label: "em regularização", value: String(d.c.regularizacao ?? 0), cor: g([200,150,20]) },
    { label: "em cassação", value: String(d.c.cassacao ?? 0), cor: g([192,57,43]) },
  ]);

  y = subtitulo(doc, y, "Riscos legais");
  y = metricas(doc, y, [
    { label: "óbitos → cassação", value: String(d.c.falecidos ?? 0), cor: g([32,36,43]) },
    { label: "não recadastrados", value: String(d.c.naoRecad ?? 0), cor: g([200,150,20]) },
    { label: "notificações abertas", value: String(d.c.notif ?? 0), cor: g([200,150,20]) },
    { label: "processos ativos", value: String(d.c.pjAtivos ?? 0), cor: g([192,57,43]) },
    { label: "ações civis públicas", value: String(d.c.acp ?? 0), cor: g([192,57,43]) },
  ]);
  [...d.derivados, ...d.riscos.map((r) => ({ t: r.titulo, s: r.origem || "risco registrado", n: r.nivel }))].forEach((r) => {
    if (y > 250) { doc.addPage(); y = 18; }
    const [cr, cg, cb] = NIVEL[r.n] ?? [136,136,136];
    doc.setFillColor(cr, cg, cb); doc.circle(M + 1.5, y - 1.2, 1.1, "F");
    doc.setFont("times", "bold").setFontSize(9.5).setTextColor(30, 30, 30); doc.text(r.t, M + 5, y);
    doc.setFont("times", "normal").setFontSize(8.5).setTextColor(100, 100, 100); doc.text(r.s, M + 5, y + 3.8);
    y += 8;
  });

  y += 3;
  y = subtitulo(doc, y, "Infraestrutura do prédio");
  y = metricas(doc, y, [
    { label: "áreas em atenção", value: String(d.c.infraAtencao ?? 0), cor: g([200,150,20]) },
    { label: "áreas críticas", value: String(d.c.infraCritico ?? 0), cor: g([192,57,43]) },
    { label: "ordens de reparo abertas", value: String(d.c.reparos ?? 0), cor: g([138,43,174]) },
  ]);

  y = subtitulo(doc, y, "Financeiro — utilidades");
  y = metricas(doc, y, [
    { label: "água (acum.)", value: BRL.format(d.util.agua), cor: g([31,155,212]) },
    { label: "energia (acum.)", value: BRL.format(d.util.energia), cor: g([200,150,20]) },
    { label: "total", value: BRL.format(d.util.agua + d.util.energia), cor: g([61,26,91]) },
    { label: "contas em atraso", value: String(d.util.atraso), cor: g([192,57,43]) },
  ]);

  assinaturas(doc, Math.max(y + 16, 252), d.gestor, d.secretario);
  previewPdf(doc, `Panorama_Estrategico_${new Date().toISOString().slice(0, 10)}.pdf`);
}
