export type DadosMaturidade = {
  total: number; ocupada: number; emCassacao: number; falecidos: number; naoRecad: number;
  inadBancas: number; recadPct: number | null; conselho: number; gestor: number; secretario: number;
  atasPub: number; sorteios: number; infraAreas: number; infraCriticas: number; procCassacao: number;
};

export type DimMaturidade = { k: string; l: string; base: string; peso: number; score: number; nota: string };

export const FAIXAS: { min: number; label: string; cor: string }[] = [
  { min: 0, label: "Inicial", cor: "#C0392B" },
  { min: 25, label: "Em estruturação", cor: "#C55A11" },
  { min: 45, label: "Em consolidação", cor: "#C8961E" },
  { min: 65, label: "Consolidado", cor: "#1F9BD4" },
  { min: 82, label: "Referência", cor: "#2E8B57" },
];

export const nivelMaturidade = (s: number) => [...FAIXAS].reverse().find((f) => s >= f.min) ?? FAIXAS[0];

const cap = (n: number) => Math.max(0, Math.min(100, n));
const pct = (n: number, den: number) => (den > 0 ? (n / den) * 100 : 0);

export function calcularDimensoes(d: DadosMaturidade): DimMaturidade[] {
  const casosCassacao = d.emCassacao + d.falecidos;
  return [
    { k: "ocupacao", l: "Regularização da ocupação", base: "art. 5º e 6º", peso: 20,
      score: cap(pct(d.ocupada, d.total)), nota: `${d.ocupada}/${d.total} bancas ocupadas` },
    { k: "cassacao", l: "Tratamento de óbitos p/ cassação", base: "art. 18 e 19", peso: 20,
      score: cap(pct(d.procCassacao, casosCassacao || 1)), nota: `${d.procCassacao} processo(s) p/ ${casosCassacao} caso(s)` },
    { k: "recad", l: "Cadastro e recadastramento", base: "art. 12", peso: 15,
      score: cap(d.recadPct ?? 0), nota: d.recadPct !== null ? `${d.recadPct.toFixed(1)}% no ultimo semestre` : "sem registro" },
    { k: "adimplencia", l: "Adimplencia financeira", base: "art. 14", peso: 15,
      score: cap(100 - pct(d.inadBancas, d.total)), nota: `${d.inadBancas} banca(s) inadimplente(s)` },
    { k: "governanca", l: "Governanca e Conselho Gestor", base: "conselho e portarias", peso: 15,
      score: cap(((d.conselho > 0 ? 100 : 0) + (d.gestor > 0 ? 100 : 0) + (d.secretario > 0 ? 100 : 0)) / 3),
      nota: `${d.conselho > 0 ? "conselho ok" : "sem conselho"} - ${d.gestor > 0 ? "gestor ok" : "sem gestor"} - ${d.secretario > 0 ? "secretario ok" : "sem secretario"}` },
    { k: "transparencia", l: "Transparencia e atos", base: "editais e atas", peso: 10,
      score: cap(((d.sorteios > 0 ? 100 : 0) + (d.atasPub > 0 ? 100 : 0)) / 2),
      nota: `${d.sorteios} edital(is) - ${d.atasPub} ata(s) publica(s)` },
    { k: "infra", l: "Infraestrutura predial", base: "conservacao", peso: 5,
      score: cap(d.infraAreas > 0 ? 100 - pct(d.infraCriticas, d.infraAreas) : 100),
      nota: `${d.infraCriticas} area(s) critica(s) de ${d.infraAreas}` },
  ];
}

export function calcularMaturidade(d: DadosMaturidade): { score: number; dims: DimMaturidade[] } {
  const dims = calcularDimensoes(d);
  const score = Math.round(dims.reduce((s, x) => s + x.score * x.peso, 0) / 100);
  return { score, dims };
}
