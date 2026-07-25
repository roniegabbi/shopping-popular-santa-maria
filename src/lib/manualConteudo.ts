export type ManualSecao = { n: string; titulo: string; intro?: string; passos?: string[] };

export const MANUAL_VERSAO = "1.0";

export const MANUAL: ManualSecao[] = [
  {
    n: "1", titulo: "Sobre a plataforma",
    intro: "A plataforma de gestão do Shopping Independência centraliza o cadastro de bancas e permissionários, o recadastramento semestral, a inadimplência, os processos de cassação, a infraestrutura, as contas de utilidades e a transparência pública, sempre ancorada no Decreto Executivo nº 3/2025.",
    passos: [
      "Ambiente público (vitrine): acessível a qualquer cidadão — mostra o mapa de bancas, como participar, indicadores e a página de Transparência.",
      "Ambiente de gestão (restrito): acessível apenas ao poder público, à concessionária e ao Conselho, mediante login. É onde ficam os dados sensíveis e as operações.",
    ],
  },
  {
    n: "2", titulo: "Acesso e login",
    intro: "O ambiente de gestão exige autenticação. Cada usuário usa seu e-mail e senha.",
    passos: [
      "Acesse o endereço da plataforma e clique na área de gestão (/admin).",
      "Informe e-mail e senha e clique em Entrar.",
      "Use o menu lateral esquerdo para navegar entre os módulos. Para sair, use o botão “Sair” ao final do menu.",
      "Nunca compartilhe sua senha. Para senhas comprometidas, troque imediatamente.",
    ],
  },
  {
    n: "3", titulo: "Painel e Panorama do Secretário",
    intro: "O Dashboard traz os números-chave do dia. O Panorama é a leitura estratégica consolidada, organizada em abas.",
    passos: [
      "Aba Visão geral: alertas prioritários (óbitos, cassações, prazos vencendo) e maiores devedores.",
      "Aba Maturidade: o termômetro do projeto (0 a 100) com 7 dimensões e os gargalos da vez.",
      "Aba Financeiro: evolução das utilidades por ano, sazonalidade e arrecadação × inadimplência.",
      "Aba Conformidade: ocupação, situações nominais, recadastramento e infraestrutura.",
      "Aba Riscos e cassação: riscos legais e o funil de cassação por etapa.",
      "Use o botão “Relatório executivo (PDF)” para exportar o panorama, já com o índice de maturidade.",
    ],
  },
  {
    n: "4", titulo: "Bancas e permissionários",
    intro: "Tela central do cadastro. Cada banca tem um número, um status e, quando ocupada, um permissionário titular.",
    passos: [
      "Consulte a situação de cada banca: ocupada, vaga, aguardando sorteio, em regularização ou em cassação.",
      "Edite o cadastro do permissionário (nome, CPF, RG, endereço). CPFs inválidos são sinalizados com alerta.",
      "Use a busca por número ou nome para localizar rapidamente.",
      "No “Painel Bancas”, veja todas as bancas como cards coloridos pela situação legal, com segmento, permissionário e auxiliar — filtre por segmento e por situação.",
      "Use “Termo (PDF)” para gerar o Termo de Autorização de Uso individual do permissionário, com as cláusulas do Decreto e as assinaturas.",
    ],
  },
  {
    n: "5", titulo: "Auxiliares (art. 13)",
    intro: "Cada permissionário pode ter 1 (um) auxiliar. Mais de um por banca é irregular (multa e, se reiterado, cassação).",
    passos: [
      "Cadastre o auxiliar vinculado à banca: nome, CPF (validado), vínculo e situação.",
      "O sistema bloqueia/sinaliza um segundo auxiliar na mesma banca, marcando-o como irregular.",
      "Use o filtro “Sem CPF válido” para ver os cadastros a completar.",
      "A situação (regular/pendente/irregular) é atualizada também pelo recadastramento.",
    ],
  },
  {
    n: "6", titulo: "Recadastramento semestral (art. 12)",
    intro: "A cada semestre registra-se o comparecimento do titular e do auxiliar. A ausência em 2 recadastramentos consecutivos enseja cassação.",
    passos: [
      "Selecione o semestre (competência) no topo.",
      "Para cada banca, marque se o titular Compareceu ou Faltou.",
      "Na coluna Auxiliar, marque o comparecimento do auxiliar — se compareceu com documentos, ele é regularizado automaticamente.",
      "Para os faltantes, use “Notificar + PDF” para gerar a convocação oficial.",
    ],
  },
  {
    n: "7", titulo: "Sorteios e editais",
    intro: "Registra os editais de cadastramento/realocação e os resultados dos sorteios públicos.",
    passos: [
      "Cadastre o edital com seu tipo e status.",
      "Registre o resultado do sorteio quando realizado.",
      "Os itens marcados como públicos aparecem na página de Transparência.",
    ],
  },
  {
    n: "8", titulo: "Inadimplentes (art. 14)",
    intro: "Controle das cotas em atraso, com semáforo de risco e geração de ofícios à concessionária.",
    passos: [
      "Lance a competência em atraso (mês/ano, taxa e condomínio) por banca, em valores R$.",
      "O semáforo classifica: 1 cota (verde), 2 (amarelo), 3 (vermelho), acima de 3 (cassação).",
      "Gere o Relatório-panorama (PDF) e o Ofício à Administradora solicitando providências.",
    ],
  },
  {
    n: "9", titulo: "Frequência — banca fechada (art. 6º)",
    intro: "Apura o fechamento injustificado: 10 dias (consecutivos ou alternados) em 30 dias enseja cassação.",
    passos: [
      "Registre cada dia em que a banca for constatada fechada (banca, data e observação).",
      "O painel conta os dias fechados nos últimos 30 dias e sinaliza ao atingir 10 (gatilho do art. 6º).",
      "No gatilho, use “Abrir cassação” para instaurar o processo já com a base legal correta.",
    ],
  },
  {
    n: "10", titulo: "Cassações (art. 18)",
    intro: "Conduz o rito completo, com controle de prazos: contraditório de 10 dias e desocupação de 30 dias.",
    passos: [
      "Abra o processo (individual) ou use “Instaurar pendentes” para abrir em lote os casos elegíveis (óbito, inadimplência acima de 3 cotas, ausência em 2 recadastramentos).",
      "Gere o “Caderno de instaurações (PDF)” — um documento com uma página por banca, para dar ciência.",
      "Registre a data de ciência: o sistema calcula o vencimento do contraditório com semáforo.",
      "Esgotado o prazo, avance para “decidido” (inicia os 30 dias de desocupação) e siga até o encerramento.",
    ],
  },
  {
    n: "11", titulo: "Notificações e documentos",
    intro: "Todos os documentos oficiais saem em PDF A4 com o timbre da Prefeitura e as assinaturas do Gestor e do Secretário.",
    passos: [
      "Documentos endereçados à administradora começam com “À Concessionária, Gestora do Shopping Independência”.",
      "Documentos ao usuário usam o termo “Permissionário(a)”.",
      "Antes de baixar, o PDF é exibido na tela para conferência (Baixar / Abrir / Fechar).",
    ],
  },
  {
    n: "12", titulo: "Contas de água e energia",
    intro: "Lançamento e acompanhamento das despesas de utilidades por mês.",
    passos: [
      "Selecione mês/ano e informe o valor em R$; escolha água ou energia.",
      "Edite ou exclua lançamentos incorretos pelo botão de edição.",
      "A evolução e a sazonalidade aparecem no Panorama financeiro.",
    ],
  },
  {
    n: "13", titulo: "Infraestrutura, Judicial, Conselho e Agentes",
    intro: "Módulos de apoio à gestão e à conformidade.",
    passos: [
      "Infraestrutura: áreas do prédio e ordens de reparo, com status de atenção/crítico.",
      "Judicial & ACP: acompanhamento de processos judiciais e ações civis públicas.",
      "Conselho Gestor: membros por representação (poder público, concessionária, comerciantes) e atas.",
      "Agentes & Portarias: cadastro do Gestor e do Secretário que assinam os documentos.",
    ],
  },
  {
    n: "14", titulo: "Automações e boas práticas",
    intro: "A plataforma envia avisos automáticos e mantém a base íntegra.",
    passos: [
      "Aviso diário (dias úteis) de prazos de contraditório e desocupação vencidos ou vencendo.",
      "Resumo semanal do índice de maturidade do projeto.",
      "Complete os cadastros incompletos (CPFs) à medida que os documentos chegam no recadastramento.",
      "Confira a página de Transparência: editais, atas e Conselho aparecem publicamente.",
    ],
  },
];
