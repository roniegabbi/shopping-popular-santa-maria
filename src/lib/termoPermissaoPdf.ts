import { jsPDF } from "jspdf";
import type { Agente } from "./notificacaoPdf";
import { previewPdf, logoFmt, type Logo } from "./pdfPreview";

const W = 210, M = 22, CW = W - M * 2;
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

export type TermoDados = {
  banca: string; pavimento?: string | null; segmento?: string | null;
  nome: string; cpf?: string | null; rg?: string | null; endereco?: string | null; bairro?: string | null;
  gestor?: Agente | null; secretario?: Agente | null; logo?: Logo | null;
};

function dataExtenso(d = new Date()) { return `Santa Maria, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; }
function portaria(a?: Agente | null) {
  if (!a?.portaria_numero) return "";
  const dt = a.portaria_data ? new Date(a.portaria_data + "T00:00:00").toLocaleDateString("pt-BR") : "";
  return `Portaria nº ${a.portaria_numero}${dt ? `, de ${dt}` : ""}`;
}

export function gerarTermoPermissao(d: TermoDados) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 14;
  if (d.logo) { const w = 22, h = (w * d.logo.h) / d.logo.w; try { doc.addImage(d.logo.dataUrl, logoFmt(d.logo), W / 2 - w / 2, y, w, h); y += h + 2; } catch { /* opcional */ } }
  doc.setFont("times", "bold").setFontSize(11).setTextColor(20, 20, 40);
  ["ESTADO DO RIO GRANDE DO SUL", "PREFEITURA MUNICIPAL DE SANTA MARIA"].forEach((l) => { doc.text(l, W / 2, y, { align: "center" }); y += 5; });
  doc.setFont("times", "normal").setFontSize(10);
  ["Secretaria de Desenvolvimento Econômico e Inovação", "Gestão do Shopping Independência"].forEach((l) => { doc.text(l, W / 2, y, { align: "center" }); y += 4.6; });
  y += 2; doc.setDrawColor(120, 120, 140).setLineWidth(0.3); doc.line(M, y, W - M, y); y += 10;

  doc.setFont("times", "bold").setFontSize(13).setTextColor(0, 0, 0);
  doc.text("TERMO DE AUTORIZAÇÃO DE USO DE ESTANDE/MÓDULO", W / 2, y, { align: "center", maxWidth: CW }); y += 6;
  doc.setFont("times", "normal").setFontSize(9.5).setTextColor(90, 90, 90);
  doc.text("Shopping Independência — Decreto Executivo nº 3, de 6 de janeiro de 2025", W / 2, y, { align: "center" }); y += 10;

  // Identificação
  const idt = (rot: string, val: string) => {
    doc.setFont("times", "bold").setFontSize(10.5).setTextColor(30, 30, 30); doc.text(rot, M, y);
    const wRot = doc.getTextWidth(rot);
    doc.setFont("times", "normal"); doc.text(val || "—", M + wRot + 1.5, y); y += 6;
  };
  doc.setFillColor(244, 240, 250); doc.roundedRect(M, y - 4, CW, 40, 2, 2, "F"); y += 2;
  idt("Permissionário(a): ", d.nome);
  idt("CPF: ", d.cpf || "—"); y -= 6;
  doc.setFont("times", "bold").setFontSize(10.5); doc.text("RG: ", M + 60, y); doc.setFont("times", "normal"); doc.text(d.rg || "—", M + 68, y); y += 6;
  idt("Endereço: ", [d.endereco, d.bairro].filter(Boolean).join(", ") || "—");
  idt("Banca nº: ", `${d.banca}${d.pavimento ? `  ·  Pavimento: ${d.pavimento}` : ""}${d.segmento ? `  ·  Segmento: ${d.segmento}` : ""}`);
  y += 6;

  const clausulas: [string, string][] = [
    ["Cláusula 1ª — Objeto.", `Fica autorizado ao(à) permissionário(a) acima qualificado(a) o uso do estande/módulo nº ${d.banca} do Shopping Independência, equipamento público situado na Praça Saldanha Marinho, para o exercício de comércio popular, nos termos dos arts. 2º e 3º do Decreto.`],
    ["Cláusula 2ª — Intransferibilidade.", "É vedado vender, transferir, ceder, emprestar, alugar ou unificar estandes/módulos, bem como expor mercadorias fora dos limites do estande (arts. 5º e 17)."],
    ["Cláusula 3ª — Auxiliar.", "É permitido 1 (um) auxiliar por estande/módulo, devidamente cadastrado no recadastramento; a existência de mais de um é ato irregular (art. 13)."],
    ["Cláusula 4ª — Obrigações e pagamento.", "O(a) permissionário(a) deve manter o estande em ordem e higiene e pagar a taxa de ocupação e o condomínio até o 5º dia útil do mês subsequente (arts. 14 e 16)."],
    ["Cláusula 5ª — Recadastramento.", "O(a) permissionário(a) e seu auxiliar devem comparecer ao recadastramento semestral, sob pena de cassação em caso de ausência em dois recadastramentos consecutivos (art. 12)."],
    ["Cláusula 6ª — Cassação.", "A autorização será cassada, assegurados o contraditório e a ampla defesa, nos casos de descumprimento do Decreto, atraso superior a 3 cotas, comércio de gêneros alimentícios, banca fechada por 10 dias em 30, óbito do titular e demais hipóteses dos arts. 6º, 14, 18 e 19."],
    ["Cláusula 7ª — Vigência.", "A presente autorização vigora enquanto mantidas as condições e requisitos do Decreto, sendo pessoal e de cunho social, não gerando direito de propriedade sobre o espaço público."],
  ];
  clausulas.forEach(([t, c]) => {
    const texto = `${t} ${c}`;
    const linhas = doc.splitTextToSize(texto, CW) as string[];
    if (y + linhas.length * 5.4 > 250) { doc.addPage(); y = 20; }
    doc.setFont("times", "bold").setFontSize(10).setTextColor(20, 20, 20);
    // desenha em bold só o rótulo: técnica simples — imprime tudo normal e o rótulo por cima
    doc.setFont("times", "normal").setTextColor(25, 25, 25);
    doc.text(linhas, M, y, { align: "justify", maxWidth: CW, lineHeightFactor: 1.4 });
    doc.setFont("times", "bold"); doc.text(t, M, y);
    y += linhas.length * 5.4 + 3;
  });

  y += 4;
  if (y > 245) { doc.addPage(); y = 24; }
  doc.setFont("times", "normal").setFontSize(11).setTextColor(15, 15, 15);
  doc.text(dataExtenso(), W - M, y, { align: "right" }); y += 16;

  // Assinatura do permissionário
  const cx0 = W / 2;
  doc.setDrawColor(0, 0, 0).setLineWidth(0.3); doc.line(cx0 - 45, y, cx0 + 45, y);
  doc.setFont("times", "bold").setFontSize(10.5).setTextColor(0, 0, 0); doc.text(d.nome || "_____________________", cx0, y + 5, { align: "center" });
  doc.setFont("times", "normal").setFontSize(9).setTextColor(60, 60, 60); doc.text("Permissionário(a)", cx0, y + 9.5, { align: "center" });
  y += 22;

  // Assinaturas do poder público
  const colW = CW / 2;
  [{ t: "Gestor(a) do Shopping Independência", a: d.gestor }, { t: "Secretário(a) de Desenvolvimento Econômico e Inovação", a: d.secretario }].forEach((b, i) => {
    const cx = M + colW * i + colW / 2;
    doc.setDrawColor(0, 0, 0).setLineWidth(0.3); doc.line(cx - 32, y, cx + 32, y);
    doc.setFont("times", "bold").setFontSize(10).setTextColor(0, 0, 0); doc.text(b.a?.nome || "_________________________", cx, y + 5, { align: "center" });
    doc.setFont("times", "normal").setFontSize(9).setTextColor(60, 60, 60); doc.text(b.a?.cargo || b.t, cx, y + 9.5, { align: "center", maxWidth: colW - 6 });
    const p = portaria(b.a); if (p) doc.text(p, cx, y + 14, { align: "center" });
  });

  doc.setFont("times", "normal").setFontSize(8).setTextColor(120, 120, 120);
  doc.text("Praça Saldanha Marinho · Centro · Santa Maria/RS — www.santamaria.rs.gov.br", W / 2, 290, { align: "center" });

  previewPdf(doc, `Termo_Permissao_Banca_${d.banca}.pdf`);
}
