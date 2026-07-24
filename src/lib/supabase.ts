import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente Supabase.
 * Usa a chave pública (anon). O que é privado é protegido por RLS no banco:
 * dados pessoais/processuais só aparecem para usuários com papel de staff.
 */
export function createSupabase() {
  return createClient(url, key);
}
