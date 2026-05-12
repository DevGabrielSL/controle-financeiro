"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

export function AuthForm() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Supabase não configurado. Confira as variáveis de ambiente antes de entrar.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const request =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${location.origin}/auth/callback` },
          });

    const { error } = await request;
    setIsLoading(false);

    if (error) {
      setMessage(getAuthErrorMessage(error.message));
      return;
    }

    if (mode === "signup") {
      setMessage("Cadastro criado. Confirme seu e-mail se o Supabase pedir confirmação.");
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-white shadow-2xl shadow-emerald-950/40 backdrop-blur">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
          Finanças
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
          {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Controle entradas, saídas, fixos, parcelas e empréstimos em um só lugar.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-300">E-mail</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@email.com"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Senha</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            placeholder="Sua senha"
            required
          />
        </label>

        {message ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200">
            {message}
          </div>
        ) : null}

        <button
          className="w-full rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isLoading}
        >
          {isLoading
            ? "Aguarde..."
            : mode === "login"
                ? "Entrar"
                : "Criar conta"}
        </button>
      </form>

      <button
        className="mt-6 text-sm font-medium text-emerald-300 hover:text-emerald-200"
        type="button"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
      </button>
    </div>
  );
}

function getAuthErrorMessage(errorMessage: string) {
  if (errorMessage === "Failed to fetch") {
    return "Não consegui conectar ao Supabase. Confira as variáveis da Vercel e faça um novo deploy.";
  }

  if (errorMessage.toLowerCase().includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Se ainda não cadastrou, clique em 'Ainda não tenho conta'.";
  }

  return errorMessage;
}
