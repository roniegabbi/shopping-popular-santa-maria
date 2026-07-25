import { jsPDF } from "jspdf";
import type { Agente } from "./notificacaoPdf";
import { previewPdf, logoFmt, type Logo } from "./pdfPreview";

const W = 210, M = 18, CW = W - M * 2;
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

export type ItemVistoria = { label: string; situacao: string; obs?: string | null };
export type VistoriaDados = {
  numero: number; ano: number; data: string; tipo: string;
  banca?: string | null; permissionario?: string | null;
  itens: ItemVistoria[]; observacoes?: string | null;
  gestor?: Agente | null; secretario?: Agente | null; logo?: Logo | null;
};

const TIPO_LABEL: Record<string, string> = { banca: "Estande/módulo", estrutural: "Estrutural / predial", area_comum: "Área comum" };

function dataExtenso(d = new Date()) { return `Santa Maria, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; }
function fmtData(s: string) { return new Date(s + "T00:00:00").toLocaleDateString("pt-BR"); }
function portaria(a?: Agente | null) {
  if (!a?.portaria_numero) return "";
  const dt = a.portaria_data ? new Date(a.portaria_data + "T00:00:00").toLocaleDateString("pt-BR") : "";
  return `Portaria nº ${a.portaria_numero}${dt ? `, de ${dt}` : ""}`;
}
function cabecalho(doc: jsPDF, logo?: Logo | null): number {
  let y = 14;
  if (logo) { const w = 22, h = (w * logo.h) / logo.w; try { doc.addImage(logo.dataUrl, logoFmt(logo), W / 2 - w / 2, y, w, h); y += h + 2; } catch { /* opcional */ } }
  doc.setFont("times", "bold").setFontSize(11).setTextColor(20, 20, 40);
  ["ESTADO DO RIO GRANDE DO SUL", "PREFEITURA MUNICIPAL DE SANTA MARIA"].forEach((l) => { doc.text(l, W / 2, y, { align: "center" }); y += 5; });
  doc.setFont("times", "normal").setFontSize(10);
  ["Secretaria de Desenvolvimento Econômico e Inovação", "Gestão do Shopping Independência"].forEach((l) => { doc.text(l, W / 2, y, { align: "center" }); y += 4.6; });
  y += 2; doc.setDrawColor(120, 120, 140).setLineWidth(0.3); doc.line(M, y, W - M, y);
  return y + 9;
}
function assinaturas(doc: jsPDF, y: number, blocos: { t: string; a?: Agente | null; nome?: string }[]) {
  const colW = CW / blocos.length;
  blocos.forEach((b, i) => {
    const cx = M + colW * i + colW / 2;
    doc.setDrawColor(0, 0, 0).setLineWidth(0.3); doc.line(cx - 30, y, cx + 30, y);
    doc.setFont("times", "bold").setFontSize(9.5).setTextColor(0, 0, 0); doc.text(b.a?.nome || b.nome || "_______________________", cx, y + 5, { align: "center" });
    doc.setFont("times", "normal").setFontSize(8.5).setTextColor(60, 60, 60); doc.text(b.a?.cargo || b.t, cx, y + 9, { align: "center", maxWidth: colW - 6 });
    const p = portaria(b.a); if (p) doc.text(p, cx, y + 13, { align: "center" });
  });
}

// ---------- Ficha Técnica de Vistoria (checklist) ----------
export function gerarFichaVistoria(d: VistoriaDados) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabecalho(doc, d.logo);
  const num = `${String(d.numero).padStart(3, "0")}/${d.ano}`;

  doc.setFont("times", "bold").setFontSize(13).setTextColor(0, 0, 0);
  doc.text(`FICHA TÉCNICA DE VISTORIA Nº ${num}`, W / 2, y, { align: "center" }); y += 8;
  doc.setFont("times", "normal").setFontSize(10).setTextColor(40, 40, 40);
  const alvo = d.tipo === "banca" ? `Estande/módulo nº ${d.banca ?? "—"}${d.permissionario ? ` — ${d.permissionario}` : ""}` : TIPO_LABEL[d.tipo] ?? d.tipo;
  doc.text(`Data: ${fmtData(d.data)}     |     Objeto: ${alvo}`, W / 2, y, { align: "center", maxWidth: CW }); y += 9;

  // tabela do checklist
  const cX = [M, M + CW - 45, M + CW - 33, M + CW - 21, M + CW - 9];
  const drawHead = () => {
    doc.setFillColor(31, 56, 100); doc.rect(M, y, CW, 7, "F");
    doc.setFont("times", "bold").setFontSize(8.5).setTextColor(255, 255, 255);
    doc.text("Item verificado", cX[0] + 1, y + 4.6);
    doc.text("C", cX[1] + 3, y + 4.6); doc.text("NC", cX[2] + 2, y + 4.6); doc.text("N/A", cX[3] + 1, y + 4.6);
    y += 7;
  };
  drawHead();
  doc.setFont("times", "normal").setTextColor(20, 20, 20);
  d.itens.forEach((it, i) => {
    const linhas = doc.splitTextToSize(it.label, CW - 48) as string[];
    const obsLinhas = it.obs ? doc.splitTextToSize(`Obs.: ${it.obs}`, CW - 48) as string[] : [];
    const hRow = Math.max(7, (linhas.length + obsLinhas.length) * 4.4 + 3);
    if (y + hRow > 250) { doc.addPage(); y = 18; drawHead(); doc.setFont("times", "normal").setTextColor(20, 20, 20); }
    if (i % 2) { doc.setFillColor(244, 240, 250); doc.rect(M, y, CW, hRow, "F"); }
    doc.setFontSize(8.8).setTextColor(20, 20, 20);
    doc.text(linhas, cX[0] + 1, y + 4.4);
    if (obsLinhas.length) { doc.setFontSize(7.8).setTextColor(90, 90, 90); doc.text(obsLinhas, cX[0] + 3, y + 4.4 + linhas.length * 4.4); }
    // caixas
    const boxY = y + 1.8;
    [cX[1] + 3, cX[2] + 3, cX[3] + 2].forEach((bx) => { doc.setDrawColor(120, 120, 140).setLineWidth(0.3); doc.rect(bx, boxY, 3.5, 3.5); });
    const marca = it.situacao === "conforme" ? 0 : it.situacao === "nao_conforme" ? 1 : it.situacao === "na" ? 2 : -1;
    if (marca >= 0) { doc.setFont("times", "bold").setFontSize(9).setTextColor(0, 0, 0); doc.text("X", [cX[1] + 3.6, cX[2] + 3.6, cX[3] + 2.6][marca], boxY + 3.2); doc.setFont("times", "normal"); }
    y += hRow;
    doc.setDrawColor(230, 226, 238); doc.line(M, y, W - M, y);
  });

  y += 4;
  doc.setFont("times", "bold").setFontSize(9).setTextColor(60, 60, 60); doc.text("Legenda: C = conforme · NC = não conforme · N/A = não se aplica", M, y); y += 7;

  // observações gerais
  doc.setFont("times", "bold").setFontSize(9.5).setTextColor(30, 30, 30); doc.text("Observações gerais:", M, y); y += 5;
  doc.setDrawColor(200, 200, 215); doc.setLineWidth(0.2);
  if (d.observacoes) {
    doc.setFont("times", "normal").setFontSize(9.5).setTextColor(30, 30, 30);
    const l = doc.splitTextToSize(d.observacoes, CW) as string[]; doc.text(l, M, y); y += l.length * 5 + 4;
  } else { for (let k = 0; k < 3; k++) { doc.line(M, y, W - M, y); y += 6; } }

  if (y > 245) { doc.addPage(); y = 22; }
  doc.setFont("times", "normal").setFontSize(10).setTextColor(15, 15, 15); doc.text(dataExtenso(new Date(d.data + "T00:00:00")), W - M, y, { align: "right" }); y += 14;
  assinaturas(doc, y, [
    { t: "Gestor(a) do Shopping — responsável pela vistoria", a: d.gestor },
    { t: d.tipo === "banca" ? "Permissionário(a) / responsável presente" : "Responsável presente", nome: d.permissionario || "" },
  ]);
  previewPdf(doc, `Ficha_Vistoria_${num.replace("/", "-")}.pdf`);
}

// ---------- Ofício de irregularidades da vistoria ----------
export function gerarOficioVistoria(d: VistoriaDados) {
  const naoConf = d.itens.filter((i) => i.situacao === "nao_conforme");
  if (naoConf.length === 0) { alert("Não há itens não conformes nesta vistoria."); return; }
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabecalho(doc, d.logo);
  const num = `${String(d.numero).padStart(3, "0")}/${d.ano}`;
  const paraConcessionaria = d.tipo !== "banca";

  doc.setFont("times", "bold").setFontSize(12).setTextColor(0, 0, 0);
  doc.text(`NOTIFICAÇÃO — VISTORIA Nº ${num}`, W / 2, y, { align: "center" }); y += 10;
  doc.setFont("times", "normal").setFontSize(11).setTextColor(15, 15, 15);
  if (paraConcessionaria) { doc.text("À Concessionária, Gestora do Shopping Independência,", M, y); y += 6; }
  else { doc.text(`Ao(À) Permissionário(a) da Banca nº ${d.banca ?? "—"}${d.permissionario ? `, ${d.permissionario}` : ""},`, M, y); y += 6; }

  const intro = paraConcessionaria
    ? `Em vistoria técnica realizada em ${fmtData(d.data)}, foram constatadas as irregularidades estruturais/prediais abaixo, cuja manutenção é de responsabilidade dessa concessionária (art. 7º, §4º do Decreto). Solicita-se a adoção das providências no prazo de 10 (dez) dias.`
    : `Em vistoria técnica realizada em ${fmtData(d.data)} no estande/módulo nº ${d.banca ?? "—"}, foram constatadas as irregularidades abaixo. Fica V.Sa. NOTIFICADO(A) a saná-las no prazo de 10 (dez) dias, sob pena de abertura de procedimento de cassação (art. 18 do Decreto).`;
  const li = doc.splitTextToSize(intro, CW) as string[];
  doc.text(li, M, y, { align: "justify", maxWidth: CW, lineHeightFactor: 1.5 }); y += li.length * 6.2 + 4;

  doc.setFont("times", "bold").setFontSize(10).setTextColor(30, 30, 30); doc.text("Itens não conformes:", M, y); y += 6;
  doc.setFont("times", "normal").setFontSize(10).setTextColor(20, 20, 20);
  naoConf.forEach((it) => {
    const linha = `• ${it.label}${it.obs ? ` — ${it.obs}` : ""}`;
    const ls = doc.splitTextToSize(linha, CW - 4) as string[];
    if (y + ls.length * 5.4 > 250) { doc.addPage(); y = 20; }
    doc.text(ls, M + 2, y); y += ls.length * 5.4 + 1.5;
  });

  y += 8;
  doc.setFont("times", "normal").setFontSize(11).setTextColor(15, 15, 15); doc.text(dataExtenso(), W - M, y, { align: "right" }); y += 16;
  assinaturas(doc, Math.max(y, 248), [
    { t: "Gestor(a) do Shopping Independência", a: d.gestor },
    { t: "Secretário(a) de Desenvolvimento Econômico e Inovação", a: d.secretario },
  ]);
  previewPdf(doc, `Notificacao_Vistoria_${num.replace("/", "-")}.pdf`);
}
