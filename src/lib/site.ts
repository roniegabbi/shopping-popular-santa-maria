import { createSupabase } from "./supabase";

export type SiteConfig = Record<string, { url?: string } | null>;

/** Lê o conteúdo editável (imagens da vitrine, logo) do site_config. */
export async function getSiteConfig(): Promise<SiteConfig> {
  const sb = createSupabase();
  const { data } = await sb.from("site_config").select("chave,valor");
  const map: SiteConfig = {};
  (data ?? []).forEach((r: { chave: string; valor: unknown }) => {
    map[r.chave] = (r.valor as { url?: string }) ?? null;
  });
  return map;
}

export function cfgUrl(cfg: SiteConfig, chave: string): string | null {
  const v = cfg?.[chave];
  return v && typeof v === "object" && v.url ? v.url : null;
}

/** Rótulos dos cards da home — usados na vitrine e no admin. */
export const HOME_CARDS: { key: string; icon: string; titulo: string; texto: string }[] = [
  { key: "card_c1", icon: "🏛️", titulo: "Espaço público, custo acessível", texto: "Ocupação por autorização de uso, com taxa de próprio municipal e condomínio — sem aluguel de mercado." },
  { key: "card_c2", icon: "🎯", titulo: "Ingresso por sorteio", texto: "Vagas preenchidas por sorteio público, com edital, habilitação e a presença do Conselho Gestor." },
  { key: "card_c3", icon: "🤝", titulo: "Gestão compartilhada", texto: "Conselho Gestor com poder público, concessionária e comerciantes, mandato de 2 anos." },
  { key: "card_c4", icon: "📍", titulo: "Coração histórico da cidade", texto: "No Complexo Histórico-Cultural Profª Agueda Brazzale Leal, na Praça Saldanha Marinho." },
  { key: "card_c5", icon: "🛡️", titulo: "Segurança e manutenção", texto: "Recepção, segurança patrimonial e manutenção predial sob responsabilidade da concessionária." },
  { key: "card_c6", icon: "📄", titulo: "Transparência", texto: "Editais, resultados de sorteio e atas do Conselho publicados para todos." },
];
