import Link from "next/link";
import { ArrowRight, BarChart3, CreditCard, Landmark, Repeat } from "lucide-react";

export default function Home() {
  const previewCards = [
    { label: "Entradas", value: "R$ 8.500,00", Icon: BarChart3 },
    { label: "Saídas", value: "R$ 4.180,00", Icon: CreditCard },
    { label: "Fixos ativos", value: "12", Icon: Repeat },
    { label: "Empréstimos", value: "R$ 2.400,00", Icon: Landmark },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">
              Money Boss
            </p>
            <h1 className="mt-2 text-xl font-bold">Controle Financeiro</h1>
          </div>
          <Link
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
            href="/login"
          >
            Entrar
          </Link>
        </nav>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200">
              Mensal, anual, fixos, parcelas e empréstimos
            </div>
            <h2 className="mt-8 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
              Um painel absurdo para mandar no seu dinheiro.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Registre entradas e saídas, acompanhe o resultado do mês, enxergue o ano
              inteiro, gere contas fixas e controle parcelas ou empréstimos sem se perder.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-emerald-300"
                href="/app"
              >
                Abrir demonstração <ArrowRight size={18} />
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-6 py-4 font-bold transition hover:bg-white/10"
                href="/login"
              >
                Usar com login
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-emerald-950/40">
            <div className="rounded-[1.5rem] bg-slate-900 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {previewCards.map(({ label, value, Icon }) => (
                  <div key={label} className="rounded-3xl bg-white/10 p-5">
                    <Icon className="text-emerald-300" />
                    <p className="mt-5 text-sm text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-3xl bg-emerald-400 p-6 text-slate-950">
                <p className="text-sm font-bold uppercase tracking-[0.25em]">Resultado do mês</p>
                <p className="mt-4 text-5xl font-black">R$ 4.320,00</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
