"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "./_components/AdminGuard";

const sb = createSupabase();

type Conf = { vagas: number; regularizacao: number; cassacao: number; aguardando: number };

export default function AdminDashboard() {
  return (
    <AdminGuard active="dashboard" title="Dashboard de Conformidade">
      <DashboardBody />
    </AdminGuard>
  );
}

function DashboardBody() {
  const [conf, setConf] = useState<Conf | null>(null);
  const [notifAbertas, setNotifAbertas] = useState<number | null>(null);
  const [judiciais, setJudiciais] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const q = (status: string) =>
        sb.from("banca").select("*", { count: "exact", head: true }).eq("status", status);
      const [{ count: vagas }, { count: reg }, { count: cas }, { count: agu }] = await Promise.all([
        q("vaga"),
        q("em_regularizacao"),
        q("em_cassacao"),
        q("aguardando_sorteio"),
      ]);
      setConf({ vagas: vagas ?? 0, regularizacao: reg ?? 0, cassacao: cas ?? 0, aguardando: agu ?? 0 });

      const { count: nab } = await sb
        .from("notificacao")
        .select("*", { count: "exact", head: true })
        .eq("status", "emitida");
      setNotifAbertas(nab ?? 0);

      const { count: pj } = await sb
        .from("processo_judicial")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");
      setJudiciais(pj ?? 0);
    })();
  }, []);

  const kpis = [
    ["Em cassação", conf?.cassacao ?? "—", "text-bad", "/admin/judicial"],
    ["Em regularização", conf?.regularizacao ?? "—", "text-warn", null],
    ["Aguardando sorteio", conf?.aguardando ?? "—", "text-sky", null],
    ["Bancas vagas", conf?.vagas ?? "—", "text-navy", null],
    ["Notificações abertas", notifAbertas ?? "—", "text-warn", "/admin/notificacoes"],
    ["Processos judiciais ativos", judiciais ?? "—", "text-bad", "/admin/judicial"],
  ] as const;

  return (
    <>
      <div className="grid gap-3.5 md:grid-cols-3">
        {kpis.map(([label, val, cls, href]) => {
          const card = (
            <div className="rounded-2xl border border-line bg-white p-4">
              <b className={`block text-3xl font-extrabold ${cls}`}>{val}</b>
              <span className="text-[12.5px] text-muted">{label}</span>
            </div>
          );
          return href ? (
            <Link key={label} href={href}>
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </div>

      <p className="mt-6 rounded-2xl border border-[#f0d3ba] bg-[#fff3e9] p-3 text-[13.5px] text-[#9a4a12]">
        🔒 Painel restrito. Os dados aparecem conforme o papel de acesso do usuário (RLS). Use o menu
        ao lado para notificações, inadimplência e processos judiciais.
      </p>
    </>
  );
}
