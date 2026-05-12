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
      localStorage.setItem("controle-financeiro-local-user", email || "modo-local");
      router.push("/app");
      router.refresh();
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
      setMessage(error.message);
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
    <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Finanças
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Controle entradas, saídas, fixos, parcelas e empréstimos em um só lugar.
        </p>
      </div>

      {!supabase ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Supabase ainda não configurado. Você pode entrar em modo local agora; quando
          configurar o `.env.local`, o login real na nuvem será ativado.
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">E-mail</span>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@email.com"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Senha</span>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            placeholder="Sua senha"
            required
          />
        </label>

        {message ? (
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

        <button
          className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isLoading}
        >
          {isLoading
            ? "Aguarde..."
            : !supabase
              ? "Entrar em modo local"
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
        </button>
      </form>

      <button
        className="mt-6 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        type="button"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
      </button>
    </div>
  );
}
