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

        <section className="flex flex-1 items-center justify-center py-12">
          <AuthForm />
        </section>
      </div>
    </main>
  );
}
