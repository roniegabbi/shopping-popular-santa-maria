import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente Supabase.
 * Usa a chave pública (anon). O que é privado é protegido por RLS no banco.
 *
 * fetch com `cache: "no-store"` para o conteúdo da vitrine (bancas, logo,
 * imagens dos cards) refletir sempre o estado atual — sem o cache de dados
 * do Next.js prender uma versão antiga.
 */
export function createSupabase() {
  return createClient(url, key, {
    global: {
      fetch: (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
