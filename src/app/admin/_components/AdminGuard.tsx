"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabase } from "@/lib/supabase";

const sb = createSupabase();

const GRUPOS: { area: string; itens: { href: string; label: string; key: string }[] }[] = [
  {
    area: "Gestão estratégica",
    itens: [
      { href: "/admin", label: "Dashboard", key: "dashboard" },
      { href: "/admin/mapa", label: "Painel Bancas", key: "mapa" },
      { href: "/admin/panorama", label: "Panorama (Secretário)", key: "panorama" },
    ],
  },
  {
    area: "Conformidade legal",
    itens: [
      { href: "/admin/bancas", label: "Bancas", key: "bancas" },
      { href: "/admin/auxiliares", label: "Auxiliares", key: "auxiliares" },
      { href: "/admin/sorteios", label: "Sorteios & Editais", key: "sorteios" },
      { href: "/admin/cassacoes", label: "Cassações", key: "cassacoes" },
      { href: "/admin/judicial", label: "Judicial & ACP", key: "judicial" },
      { href: "/admin/conselho", label: "Conselho Gestor", key: "conselho" },
    ],
  },
  {
    area: "Rotinas de acompanhamento",
    itens: [
      { href: "/admin/recadastramento", label: "Recadastramento", key: "recadastramento" },
      { href: "/admin/frequencia", label: "Frequência (art. 6º)", key: "frequencia" },
      { href: "/admin/vistorias", label: "Vistorias", key: "vistorias" },
      { href: "/admin/infraestrutura", label: "Infraestrutura", key: "infraestrutura" },
      { href: "/admin/notificacoes", label: "Notificações", key: "notificacoes" },
    ],
  },
  {
    area: "Gestão financeira",
    itens: [
      { href: "/admin/inadimplentes", label: "Inadimplentes", key: "inadimplentes" },
      { href: "/admin/contas", label: "Contas (água/energia)", key: "contas" },
    ],
  },
  {
    area: "Configurações",
    itens: [
      { href: "/admin/agentes", label: "Agentes & Portarias", key: "agentes" },
      { href: "/admin/identidade", label: "Identidade Visual", key: "identidade" },
      { href: "/admin/manual", label: "Manual de Uso", key: "manual" },
    ],
  },
];

export default function AdminGuard({
  active,
  title,
  children,
}: {
  active: string;
  title: string;
  children: React.ReactNode;
}) {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (email === undefined) {
    return <div className="container-page py-16 text-muted">Carregando…</div>;
  }
  if (!email) return <LoginForm />;

  return (
    <div className="container-page grid gap-6 py-8 md:grid-cols-[220px_1fr]">
      <aside className="h-max rounded-2xl border border-line bg-white p-3">
        <nav className="grid gap-1">
          {GRUPOS.map((g, gi) => (
            <div key={g.area} className={gi > 0 ? "mt-3" : ""}>
              <p className="mb-1 border-b border-line px-2 pb-1.5 text-[12.5px] font-extrabold uppercase tracking-wider text-navy">{g.area}</p>
              {g.itens.map((n) => (
                <Link
                  key={n.key}
                  href={n.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-semibold ${
                    active === n.key ? "bg-navy text-white" : "text-muted hover:bg-[#F1EAF8] hover:text-navy"
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <button
          onClick={() => sb.auth.signOut()}
          className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted hover:bg-[#F1EAF8]"
        >
          Sair
        </button>
        <p className="mt-2 truncate px-2 text-[11px] text-muted">{email}</p>
      </aside>

      <section>
        <h1 className="mb-5 text-2xl font-extrabold text-navy">{title}</h1>
        {children}
      </section>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) setErro("Não foi possível entrar. Verifique e-mail e senha.");
  }

  return (
    <section className="py-16">
      <div className="container-page max-w-md">
        <h1 className="text-2xl font-extrabold text-navy">Painel de Gestão</h1>
        <p className="mb-6 mt-1 text-sm text-muted">
          Acesso restrito — poder público, concessionária e Conselho Gestor.
        </p>
        <form onSubmit={entrar} className="rounded-2xl border border-line bg-white p-6">
          <label className="mb-1 block text-[13px] font-bold text-navy">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-line px-3 py-2.5 text-sm"
            placeholder="voce@santamaria.rs.gov.br"
          />
          <label className="mb-1 block text-[13px] font-bold text-navy">Senha</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mb-4 w-full rounded-lg border border-line px-3 py-2.5 text-sm"
          />
          {erro && <p className="mb-3 text-sm text-bad">{erro}</p>}
          <button
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-white disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </section>
  );
}
