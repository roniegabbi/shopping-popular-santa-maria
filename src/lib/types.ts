export type BancaStatus =
  | "ocupada"
  | "vaga"
  | "aguardando_sorteio"
  | "em_regularizacao"
  | "em_cassacao"
  | "lacrada";

export type Pavimento = "terreo" | "pav1" | "pav2";

export interface Segmento {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
}

export interface Banca {
  id: string;
  numero: string;
  pavimento: Pavimento;
  status: BancaStatus;
  segmento_id: string | null;
  segmento?: Segmento | null;
}

export const STATUS_LABEL: Record<BancaStatus, string> = {
  ocupada: "Ocupada",
  vaga: "Vaga (sorteio)",
  aguardando_sorteio: "Aguardando sorteio",
  em_regularizacao: "Em regularização",
  em_cassacao: "Em cassação",
  lacrada: "Lacrada",
};

export const PAVIMENTO_LABEL: Record<Pavimento, string> = {
  terreo: "Térreo",
  pav1: "1º Pavimento",
  pav2: "2º Pavimento",
};

export const STATUS_COLOR: Record<BancaStatus, string> = {
  ocupada: "#58B947",
  vaga: "#D9CEE6",
  aguardando_sorteio: "#1F9BD4",
  em_regularizacao: "#F7A81E",
  em_cassacao: "#E6188D",
  lacrada: "#6E5C82",
};
