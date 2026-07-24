import { jsPDF } from "jspdf";
import { gerarTextoNotificacao, type DadosNotificacao } from "./notificacaoTexto";

export type Agente = {
  nome: string;
  cargo: string;
  portaria_numero?: string | null;
  portaria_data?: string | null;
};

export type NotificacaoPdf = DadosNotificacao & {
  numeroOficial?: string | null;
  gestor?: Agente | null;
  secretario?: Agente | null;
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataExtenso(d = new Date()): string {
  return `Santa Maria, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function portariaLinha(a?: Agente | null): string {
  if (!a?.portaria_numero) return "";
  const dt = a.portaria_data ? new Date(a.portaria_data + "T00:00:00").toLocaleDateString("pt-BR") : "";
  return `Portaria nº ${a.portaria_numero}${dt ? `, de ${dt}` : ""}`;
}

export function gerarNotificacaoPDF(n: NotificacaoPdf) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 25;
  const cw = W - margin * 2;
  let y = 20;

  // ---------- Cabeçalho oficial ----------
  doc.setFont("times", "bold").setFontSize(11).setTextColor(20, 20, 40);
  const head = [
    "ESTADO DO RIO GRANDE DO SUL",
    "PREFEITURA MUNICIPAL DE SANTA MARIA",
  ];
  head.forEach((l) => {
    doc.text(l, W / 2, y, { align: "center" });
    y += 5;
  });
  doc.setFont("times", "normal").setFontSize(10.5);
  ["Secretaria de Desenvolvimento Econômico e Inovação", "Gestão do Shopping Independência"].forEach((l) => {
    doc.text(l, W / 2, y, { align: "center" });
    y += 5;
  });
  y += 2;
  doc.setDrawColor(120, 120, 140).setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);
  y += 12;

  // ---------- Título ----------
  const numero = n.numeroOficial ? String(n.numeroOficial) : "____";
  doc.setFont("times", "bold").setFontSize(13).setTextColor(0, 0, 0);
  doc.text(`NOTIFICAÇÃO Nº ${numero}/${new Date().getFullYear()}`, W / 2, y, { align: "center" });
  y += 12;

  // ---------- Corpo ----------
  doc.setFont("times", "normal").setFontSize(11.5).setTextColor(15, 15, 15);
  const paragrafos = gerarTextoNotificacao(n);
  paragrafos.forEach((p) => {
    const linhas = doc.splitTextToSize(p, cw) as string[];
    doc.text(linhas, margin, y, { align: "justify", maxWidth: cw, lineHeightFactor: 1.5 });
    y += linhas.length * 6.4 + 4;
  });

  // ---------- Data ----------
  y += 6;
  doc.text(dataExtenso(), W - margin, y, { align: "right" });
  y += 24;

  // ---------- Assinaturas ----------
  const blocos: { titulo: string; ag?: Agente | null }[] = [
    { titulo: "Gestor(a) do Shopping Independência", ag: n.gestor },
    { titulo: "Secretário(a) de Desenvolvimento Econômico e Inovação", ag: n.secretario },
  ];
  const colW = cw / 2;
  blocos.forEach((b, i) => {
    const cx = margin + colW * i + colW / 2;
    doc.setDrawColor(0, 0, 0).setLineWidth(0.3);
    doc.line(cx - 32, y, cx + 32, y);
    doc.setFont("times", "bold").setFontSize(10.5);
    doc.text(b.ag?.nome || "_________________________", cx, y + 5, { align: "center" });
    doc.setFont("times", "normal").setFontSize(9.5).setTextColor(60, 60, 60);
    doc.text(b.ag?.cargo || b.titulo, cx, y + 10, { align: "center", maxWidth: colW - 6 });
    const port = portariaLinha(b.ag);
    if (port) doc.text(port, cx, y + 15, { align: "center" });
    doc.setTextColor(15, 15, 15);
  });

  // ---------- Rodapé ----------
  doc.setFont("times", "normal").setFontSize(8).setTextColor(120, 120, 120);
  doc.text(
    "Praça Saldanha Marinho · Centro · Santa Maria/RS — www.santamaria.rs.gov.br",
    W / 2,
    290,
    { align: "center" }
  );

  const nome = `Notificacao_${numero}${n.bancaNumero ? `_banca${n.bancaNumero}` : ""}.pdf`;
  doc.save(nome);
}
