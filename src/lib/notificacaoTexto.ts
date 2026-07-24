// Redação da notificação com base no Decreto Executivo de Normas de
// Funcionamento do Shopping Independência.

export type DadosNotificacao = {
  tipo: string;
  destinatario: string;
  bancaNumero?: string | null;
  permissionarioNome?: string | null;
  prazo?: string | null; // ISO date
  assunto?: string | null;
  descricao?: string | null;
  baseLegal?: string | null;
};

const DECRETO = "Decreto Executivo que dispõe sobre as normas de funcionamento do Shopping Independência";

function prazoTexto(prazo?: string | null): string {
  if (!prazo) return "no prazo por esta Administração determinado";
  const d = new Date(prazo + "T00:00:00");
  return `até ${d.toLocaleDateString("pt-BR")}`;
}

function objeto(d: DadosNotificacao): string {
  return (d.assunto || d.descricao || "a irregularidade apontada").trim();
}

export function baseLegalPadrao(tipo: string, destinatario: string): string {
  if (destinatario === "administradora") return "Art. 7º do Decreto";
  switch (tipo) {
    case "irregularidade": return "Art. 5º e 17 do Decreto";
    case "inadimplencia": return "Art. 14, §3º e art. 19, II do Decreto";
    case "recadastramento": return "Art. 12, V do Decreto";
    case "cassacao": return "Art. 18 do Decreto";
    case "recolhimento": return "Art. 18, IV do Decreto";
    default: return "Decreto de Normas de Funcionamento";
  }
}

/** Gera os parágrafos do corpo da notificação. */
export function gerarTextoNotificacao(d: DadosNotificacao): string[] {
  const prazo = prazoTexto(d.prazo);
  const banca = d.bancaNumero ? `nº ${d.bancaNumero}` : "";
  const base = d.baseLegal || baseLegalPadrao(d.tipo, d.destinatario);

  if (d.destinatario === "administradora") {
    return [
      "À Concessionária, Gestora do Shopping Independência,",
      `Fica essa Concessionária, por meio deste, NOTIFICADA a, ${prazo}, ${objeto(d)}.`,
      `A presente notificação fundamenta-se no ${DECRETO} (${base}), competindo à Concessionária a apresentação de informações e documentos sempre que solicitada, respeitados os prazos concedidos pela Administração Pública.`,
      `O não atendimento no prazo assinalado ensejará a adoção das medidas administrativas cabíveis.`,
    ];
  }

  const cabecalho = d.permissionarioNome
    ? `Ao(À) Permissionário(a) Sr.(a) ${d.permissionarioNome}, do estande/banca ${banca} do Shopping Independência.`
    : `Ao(À) Permissionário(a) do estande/banca ${banca} do Shopping Independência.`;

  let corpo: string;
  switch (d.tipo) {
    case "inadimplencia":
      corpo = `Fica V.Sa. NOTIFICADO(A) a, ${prazo}, regularizar os débitos pendentes relativos à taxa de ocupação de próprio municipal e ao condomínio do estande/banca ${banca}, sob pena de protesto da dívida e de abertura de procedimento de cassação da autorização de uso, nos termos do ${DECRETO} (${base}).`;
      break;
    case "recadastramento":
      corpo = `Fica V.Sa. NOTIFICADO(A) a comparecer ao recadastramento do Shopping Independência, ${prazo}, munido(a) da documentação exigida, sob pena de, caracterizada a ausência em 2 (dois) recadastramentos consecutivos, ser instaurado procedimento administrativo com vistas à cassação da autorização, nos termos do ${DECRETO} (${base}).`;
      break;
    case "cassacao":
      corpo = `Fica V.Sa. NOTIFICADO(A) da abertura de procedimento de cassação da autorização de uso do estande/banca ${banca}, em razão de ${objeto(d)}, sendo-lhe facultado o exercício do contraditório e da ampla defesa ${prazo}, nos termos do ${DECRETO} (${base}).`;
      break;
    case "recolhimento":
      corpo = `Fica V.Sa. NOTIFICADO(A) a desocupar o estande/banca ${banca} no prazo de 30 (trinta) dias, com a entrega das chaves à empresa administradora, sob pena de lacre do espaço e recolhimento das mercadorias e pertences nele encontrados, nos termos do ${DECRETO} (${base}).`;
      break;
    default: // irregularidade
      corpo = `Fica V.Sa. NOTIFICADO(A) a, ${prazo}, sanar a seguinte irregularidade constatada no estande/banca ${banca}: ${objeto(d)}, nos termos do ${DECRETO} (${base}).`;
  }

  const fecho =
    d.tipo === "cassacao"
      ? `Decorrido o prazo sem manifestação, o procedimento seguirá seu curso regular.`
      : `O não atendimento, após as notificações cabíveis, ensejará o encaminhamento à Administração Pública e a abertura de procedimento de cassação da autorização de uso, facultados o contraditório e a ampla defesa (art. 18 do Decreto).`;

  return [cabecalho, corpo, fecho];
}
