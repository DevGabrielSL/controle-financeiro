import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_34%),#020617] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">
            Money Boss
          </p>
          <h1 className="mt-2 text-xl font-bold">Controle Financeiro</h1>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden lg:block">
            <div className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200">
              Mensal, anual, fixos, parcelas e empréstimos
            </div>
            <h2 className="mt-8 max-w-3xl text-5xl font-black tracking-tight">
              Entre para controlar seu dinheiro com clareza.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Acesse suas entradas, saídas, contas fixas, parcelamentos e empréstimos
              em qualquer lugar, sempre com login seguro.
            </p>
          </div>

          <AuthForm />
        </section>
      </div>
    </main>
  );
}
