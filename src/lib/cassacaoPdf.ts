import { jsPDF } from "jspdf";
import type { Agente } from "./notificacaoPdf";
import { previewPdf, logoFmt, type Logo } from "./pdfPreview";

const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const W = 210, M = 25, CW = W - M * 2;

export type ItemCassacao = { banca: string; nome: string | null; gatilho: string; baseLegal: string | null };

function dataExtenso(d = new Date()) { return `Santa Maria, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; }
function portariaLinha(a?: Agente | null) {
  if (!a?.portaria_numero) return "";
  const dt = a.portaria_data ? new Date(a.portaria_data + "T00:00:00").toLocaleDateString("pt-BR") : "";
  return `Portaria nº ${a.portaria_numero}${dt ? `, de ${dt}` : ""}`;
}

function cabecalho(doc: jsPDF, logo?: Logo | null): number {
  let y = 16;
  if (logo) { const w = 24, h = (w * logo.h) / logo.w; doc.addImage(logo.dataUrl, logoFmt(logo), W / 2 - w / 2, y, w, h); y += h + 3; }
  doc.setFont("times", "bold").setFontSize(11).setTextColor(20, 20, 40);
  ["ESTADO DO RIO GRANDE DO SUL", "PREFEITURA MUNICIPAL DE SANTA MARIA"].forEach((l) => { doc.text(l, W / 2, y, { align: "center" }); y += 5; });
  doc.setFont("times", "normal").setFontSize(10.5);
  ["Secretaria de Desenvolvimento Econômico e Inovação", "Gestão do Shopping Independência"].forEach((l) => { doc.text(l, W / 2, y, { align: "center" }); y += 5; });
  y += 2; doc.setDrawColor(120, 120, 140).setLineWidth(0.3); doc.line(M, y, W - M, y);
  return y + 12;
}

function assinaturas(doc: jsPDF, y: number, gestor?: Agente | null, secretario?: Agente | null) {
  const colW = CW / 2;
  [{ t: "Gestor(a) do Shopping Independência", a: gestor }, { t: "Secretário(a) de Desenvolvimento Econômico e Inovação", a: secretario }].forEach((b, i) => {
    const cx = M + colW * i + colW / 2;
    doc.setDrawColor(0, 0, 0).setLineWidth(0.3); doc.line(cx - 32, y, cx + 32, y);
    doc.setFont("times", "bold").setFontSize(10.5).setTextColor(0, 0, 0); doc.text(b.a?.nome || "_________________________", cx, y + 5, { align: "center" });
    doc.setFont("times", "normal").setFontSize(9.5).setTextColor(60, 60, 60); doc.text(b.a?.cargo || b.t, cx, y + 10, { align: "center", maxWidth: colW - 6 });
    const p = portariaLinha(b.a); if (p) doc.text(p, cx, y + 15, { align: "center" });
  });
}

function pagina(doc: jsPDF, it: ItemCassacao, gestor?: Agente | null, secretario?: Agente | null, logo?: Logo | null) {
  let y = cabecalho(doc, logo);
  doc.setFont("times", "bold").setFontSize(12.5).setTextColor(0, 0, 0);
  doc.text("NOTIFICAÇÃO DE INSTAURAÇÃO DE PROCEDIMENTO DE CASSAÇÃO", W / 2, y, { align: "center", maxWidth: CW }); y += 11;

  const obito = /óbito|obito/i.test(it.gatilho);
  const destinatario = obito
    ? `Ao ocupante ou responsável pela Banca nº ${it.banca} do Shopping Independência (titular falecido: ${it.nome || "não identificado"}),`
    : `Ao(À) Permissionário(a) da Banca nº ${it.banca} do Shopping Independência${it.nome ? `, Sr(a). ${it.nome}` : ""},`;

  const base = it.baseLegal ? `${it.gatilho} (${it.baseLegal})` : it.gatilho;
  const paras = [
    destinatario,
    `Fica Vossa Senhoria NOTIFICADA da instauração de procedimento administrativo de cassação da autorização de uso da Banca nº ${it.banca}, com fundamento em ${base} e no art. 18 do Decreto de Normas de Funcionamento do Shopping Independência.`,
    `Em observância aos princípios do contraditório e da ampla defesa (art. 5º, inciso LV, da Constituição Federal), fica assegurado o prazo de 10 (dez) dias, contados do recebimento desta, para apresentação de defesa escrita e das provas que entender pertinentes, dirigida à Gestão do Shopping Independência.`,
    `Decorrido o prazo sem manifestação, ou sendo a defesa julgada improcedente, o procedimento seguirá para decisão da autoridade competente, com posterior desocupação no prazo de 30 (trinta) dias e lacração da banca, nos termos do Decreto.`,
  ];
  doc.setFont("times", "normal").setFontSize(11.5).setTextColor(15, 15, 15);
  paras.forEach((p, i) => {
    doc.setFont("times", i === 0 ? "bold" : "normal");
    const linhas = doc.splitTextToSize(p, CW) as string[];
    doc.text(linhas, M, y, { align: "justify", maxWidth: CW, lineHeightFactor: 1.5 });
    y += linhas.length * 6.4 + 4;
  });

  y += 4;
  doc.setFont("times", "normal").setFontSize(11.5).setTextColor(15, 15, 15);
  doc.text(dataExtenso(), W - M, y, { align: "right" });
  assinaturas(doc, Math.max(y + 22, 250), gestor, secretario);
  doc.setFont("times", "normal").setFontSize(8).setTextColor(120, 120, 120);
  doc.text("Praça Saldanha Marinho · Centro · Santa Maria/RS — www.santamaria.rs.gov.br", W / 2, 290, { align: "center" });
}

export function gerarCadernoInstauracao(opts: { itens: ItemCassacao[]; gestor?: Agente | null; secretario?: Agente | null; logo?: Logo | null }) {
  const { itens } = opts;
  if (!itens.length) { alert("Nenhum processo em aberto para gerar instaurações."); return; }
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ordenados = [...itens].sort((a, b) => Number(a.banca) - Number(b.banca));
  ordenados.forEach((it, i) => { if (i > 0) doc.addPage(); pagina(doc, it, opts.gestor, opts.secretario, opts.logo); });
  previewPdf(doc, `Caderno_Instauracao_Cassacao_${new Date().toISOString().slice(0, 10)}.pdf`);
}
