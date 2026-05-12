"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeDollarSign,
  CalendarClock,
  CreditCard,
  Landmark,
  Plus,
  Repeat,
  Trash2,
  WalletCards,
  Wrench,
} from "lucide-react";
import {
  buildAnnualSummary,
  buildInstallmentTransactions,
  buildLoanTransactions,
  createId,
  defaultFinanceState,
  ensureCreditCardAccounts,
  generateRecurringForMonths,
  getTransactionsForMonth,
  summarizeTransactions,
} from "@/lib/finance";
import { FinanceState, TransactionStatus, TransactionType, CardPaymentType } from "@/lib/types";
import { cn, currentMonth, formatCurrency, formatMonth, toDateInput } from "@/lib/utils";
import {
  loadCloudFinanceState,
  saveCloudFinanceState,
} from "@/lib/supabase/finance-sync";

const storageKey = "controle-financeiro-state";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "transactions", label: "Entradas e saídas" },
  { id: "cards", label: "Cartões" },
  { id: "recurring", label: "Fixos" },
  { id: "installments", label: "Parcelas" },
  { id: "loans", label: "Empréstimos" },
  { id: "maintenance", label: "Manutenção" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/** Ordem fixa das opções no seletor Cartão da aba Cartões (nomes das contas). */
const cardPanelOptionNames = [
  "Santander - Gabriel",
  "Santander - Maria",
  "Nubank - Gabriel",
  "Nubank - Maria",
  "Banco do Brasil - Maria",
] as const;

function isCloudDatasetEmpty(cloud: FinanceState) {
  return (
    cloud.accounts.length === 0 &&
    cloud.categories.length === 0 &&
    cloud.transactions.length === 0 &&
    cloud.recurringItems.length === 0 &&
    cloud.installmentPlans.length === 0 &&
    cloud.loans.length === 0
  );
}

export function FinanceApp({ userEmail }: { userEmail?: string }) {
  const [state, setState] = useState<FinanceState>(() => {
    if (typeof window === "undefined") {
      return defaultFinanceState;
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return ensureCreditCardAccounts(JSON.parse(saved) as FinanceState);
    }
    return defaultFinanceState;
  });
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [month, setMonth] = useState(currentMonth());
  const [syncStatus, setSyncStatus] = useState(
    userEmail ? "Conectando à nuvem..." : "Pronto.",
  );
  const cloudReadyRef = useRef(false);
  const skipCloudSaveRef = useRef(false);

  useEffect(() => {
    if (!userEmail) {
      cloudReadyRef.current = false;
      return;
    }

    let cancelled = false;
    cloudReadyRef.current = false;

    (async () => {
      try {
        setSyncStatus("Carregando seus dados na nuvem...");
        const cloudState = await loadCloudFinanceState();
        if (cancelled) {
          return;
        }
        if (!cloudState) {
          cloudReadyRef.current = false;
          setSyncStatus("Não foi possível carregar a nuvem. Verifique o login.");
          return;
        }

        let next = cloudState;
        if (isCloudDatasetEmpty(next)) {
          next = structuredClone(defaultFinanceState);
        } else {
          next = ensureCreditCardAccounts(next);
        }

        skipCloudSaveRef.current = true;
        cloudReadyRef.current = true;
        setState(next);
        setSyncStatus("Sincronizado com a sua conta.");
      } catch (error) {
        if (!cancelled) {
          cloudReadyRef.current = false;
          setSyncStatus(error instanceof Error ? error.message : "Erro ao carregar da nuvem.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail || !cloudReadyRef.current) {
      return;
    }
    if (skipCloudSaveRef.current) {
      skipCloudSaveRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setSyncStatus("Salvando na nuvem...");
        await saveCloudFinanceState(state);
        setSyncStatus("Salvo na nuvem.");
      } catch (error) {
        setSyncStatus(error instanceof Error ? error.message : "Erro ao salvar na nuvem.");
      }
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [state, userEmail]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [state]);

  const monthlyTransactions = useMemo(
    () => getTransactionsForMonth(state.transactions, month),
    [state.transactions, month],
  );
  const monthlySummary = useMemo(
    () => summarizeTransactions(monthlyTransactions, { includePending: true }),
    [monthlyTransactions],
  );
  const cardSpendByCard = useMemo(() => {
    const creditCards = state.accounts.filter((account) => account.kind === "credit_card");
    const cardIds = new Set(creditCards.map((c) => c.id));
    const totals = new Map<string, number>();
    for (const transaction of monthlyTransactions) {
      if (!cardIds.has(transaction.accountId)) {
        continue;
      }
      if (transaction.type !== "expense") {
        continue;
      }
      totals.set(transaction.accountId, (totals.get(transaction.accountId) ?? 0) + transaction.amount);
    }
    return creditCards.map((account) => ({
      id: account.id,
      name: account.name,
      total: totals.get(account.id) ?? 0,
    }));
  }, [monthlyTransactions, state.accounts]);
  const annualSummary = useMemo(
    () => buildAnnualSummary(state.transactions, Number(month.slice(0, 4))),
    [state.transactions, month],
  );

  const pendingTotal = monthlyTransactions
    .filter((transaction) => transaction.status === "pending")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  function updateState(nextState: FinanceState) {
    setState(nextState);
  }

  function deleteTransaction(transactionId: string) {
    if (!window.confirm("Remover este lançamento?")) {
      return;
    }

    updateState({
      ...state,
      transactions: state.transactions.filter((transaction) => transaction.id !== transactionId),
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-950/95 p-6 lg:block">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-400 p-3 text-slate-950">
            <BadgeDollarSign />
          </div>
          <div>
            <p className="text-sm text-slate-400">Controle Financeiro</p>
            <h1 className="text-xl font-bold">Money Boss</h1>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                activeTab === tab.id
                  ? "bg-emerald-400 text-slate-950"
                  : "text-slate-300 hover:bg-white/10",
              )}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-3xl bg-white/10 p-4 text-sm text-slate-300">
          <p className="font-semibold text-white">Usuário</p>
          <p className="mt-1 truncate">{userEmail ?? "Modo demonstração"}</p>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 px-4 py-4 backdrop-blur lg:px-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                Visão {formatMonth(month)}
              </p>
              <h2 className="mt-1 text-3xl font-bold">Painel financeiro</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            {userEmail ? syncStatus : "Dados só neste aparelho."}
          </p>

          <div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold",
                  activeTab === tab.id ? "bg-emerald-400 text-slate-950" : "bg-white/10",
                )}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <section className="space-y-6 p-4 lg:p-10">
          <SummaryCards
            balance={monthlySummary.balance}
            expense={monthlySummary.expense}
            income={monthlySummary.income}
            pending={pendingTotal}
          />

          {activeTab === "dashboard" ? (
            <Dashboard
              annualSummary={annualSummary}
              cardSpendByCard={cardSpendByCard}
              transactions={monthlyTransactions}
              onDeleteTransaction={deleteTransaction}
            />
          ) : null}
          {activeTab === "transactions" ? (
            <TransactionsPanel state={state} setState={updateState} />
          ) : null}
          {activeTab === "cards" ? (
            <CardsPanel month={month} state={state} setState={updateState} />
          ) : null}
          {activeTab === "recurring" ? (
            <RecurringPanel state={state} setState={updateState} />
          ) : null}
          {activeTab === "installments" ? (
            <InstallmentsPanel state={state} setState={updateState} />
          ) : null}
          {activeTab === "loans" ? <LoansPanel state={state} setState={updateState} /> : null}
          {activeTab === "maintenance" ? (
            <MaintenancePanel state={state} setState={updateState} />
          ) : null}
        </section>
      </main>
    </div>
  );
}

function SummaryCards({
  income,
  expense,
  balance,
  pending,
}: {
  income: number;
  expense: number;
  balance: number;
  pending: number;
}) {
  const cards = [
    { label: "Entradas previstas", value: income, icon: ArrowUpRight, tone: "text-emerald-300" },
    { label: "Saídas previstas", value: expense, icon: ArrowDownLeft, tone: "text-rose-300" },
    { label: "Resultado previsto", value: balance, icon: WalletCards, tone: "text-sky-300" },
    { label: "Pendentes", value: pending, icon: CalendarClock, tone: "text-amber-300" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">{card.label}</p>
            <card.icon className={card.tone} size={22} />
          </div>
          <p className="mt-4 text-3xl font-bold">{formatCurrency(card.value)}</p>
        </div>
      ))}
    </div>
  );
}

function Dashboard({
  annualSummary,
  cardSpendByCard,
  onDeleteTransaction,
  transactions,
}: {
  annualSummary: ReturnType<typeof buildAnnualSummary>;
  cardSpendByCard: { id: string; name: string; total: number }[];
  onDeleteTransaction: (transactionId: string) => void;
  transactions: FinanceState["transactions"];
}) {
  const chartData = annualSummary.map((summary) => ({
    name: summary.month.slice(5),
    Entradas: summary.income,
    Saídas: summary.expense,
  }));

  const cardChartData = [...cardSpendByCard]
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((row) => ({
      name: row.name,
      Gasto: row.total,
    }));

  const cardChartDataAll = [...cardSpendByCard].sort((a, b) => b.total - a.total).map((row) => ({
    name: row.name,
    Gasto: row.total,
  }));

  const dataForCardChart = cardChartData.length > 0 ? cardChartData : cardChartDataAll;
  const cardChartHeightPx = Math.min(440, Math.max(200, dataForCardChart.length * 48));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
          <h3 className="text-xl font-bold">Resumo anual</h3>
          <div className="mt-6 h-80 min-h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                />
                <Bar dataKey="Entradas" fill="#34d399" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Saídas" fill="#fb7185" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
          <h3 className="text-xl font-bold">Lançamentos do mês</h3>
          <TransactionList
            transactions={transactions.slice(0, 8)}
            onDelete={onDeleteTransaction}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold">Gastos no cartão por banco</h3>
            <p className="mt-1 text-sm text-slate-400">
              Saídas do mês selecionado no topo, somadas por cartão (crédito e débito no cartão). Pendentes e
              pagos entram na soma.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-300">
            <CreditCard className="text-emerald-300" size={18} />
            <span>{cardSpendByCard.length} cartões</span>
          </div>
        </div>
        <div className="mt-6 w-full min-h-[200px]" style={{ height: cardChartHeightPx }}>
          {dataForCardChart.length === 0 ? (
            <EmptyState text="Nenhum cartão cadastrado ainda." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={dataForCardChart}
                  margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#cbd5e1"
                    tickFormatter={(v) => formatCurrency(Number(v))}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={148}
                    stroke="#cbd5e1"
                    tick={{ fill: "#e2e8f0", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                  />
                  <Bar dataKey="Gasto" fill="#f472b6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionsPanel({
  state,
  setState,
}: {
  state: FinanceState;
  setState: (state: FinanceState) => void;
}) {
  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = form.get("type") as TransactionType;

    setState({
      ...state,
      transactions: [
        {
          id: createId("txn"),
          description: String(form.get("description")),
          type,
          amount: Number(form.get("amount")),
          date: String(form.get("date")),
          status: form.get("status") as TransactionStatus,
          categoryId: String(form.get("categoryId")),
          accountId: String(form.get("accountId")),
        },
        ...state.transactions,
      ],
    });
    event.currentTarget.reset();
  }

  function deleteTransaction(transactionId: string) {
    if (!window.confirm("Remover este lançamento?")) {
      return;
    }

    setState({
      ...state,
      transactions: state.transactions.filter((transaction) => transaction.id !== transactionId),
    });
  }

  return (
    <Panel
      title="Entradas e saídas"
      description="Registre tudo que entrou ou saiu, com status pago ou pendente."
      icon={<Plus />}
    >
      <FinanceForm onSubmit={addTransaction}>
        <Select name="type" label="Tipo" options={[["income", "Entrada"], ["expense", "Saída"]]} />
        <Input name="description" label="Descrição" required />
        <Input name="amount" label="Valor" type="number" step="0.01" min="0" required />
        <Input name="date" label="Data" type="date" defaultValue={toDateInput()} required />
        <Select
          name="status"
          label="Status"
          options={[["paid", "Pago"], ["pending", "Pendente"]]}
        />
        <CategorySelect state={state} />
        <AccountSelect state={state} />
        <SubmitButton>Adicionar lançamento</SubmitButton>
      </FinanceForm>
      <TransactionList transactions={state.transactions} onDelete={deleteTransaction} />
    </Panel>
  );
}

function CardsPanel({
  month,
  state,
  setState,
}: {
  month: string;
  state: FinanceState;
  setState: (state: FinanceState) => void;
}) {
  const creditCards = useMemo(
    () => state.accounts.filter((account) => account.kind === "credit_card"),
    [state.accounts],
  );
  const cardAccountIds = useMemo(() => new Set(creditCards.map((c) => c.id)), [creditCards]);

  const [cardFilter, setCardFilter] = useState<string>("all");

  useEffect(() => {
    if (cardFilter !== "all" && !creditCards.some((card) => card.id === cardFilter)) {
      setCardFilter("all");
    }
  }, [cardFilter, creditCards]);

  const cardMonthTransactions = useMemo(() => {
    let list = getTransactionsForMonth(state.transactions, month).filter((transaction) =>
      cardAccountIds.has(transaction.accountId),
    );
    if (cardFilter !== "all") {
      list = list.filter((transaction) => transaction.accountId === cardFilter);
    }
    return list;
  }, [cardAccountIds, cardFilter, month, state.transactions]);

  function addCardTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const accountId = String(form.get("accountId"));
    const account = state.accounts.find((item) => item.id === accountId);

    if (!account || account.kind !== "credit_card") {
      window.alert("Selecione um cartão de crédito válido.");
      return;
    }

    const cardPaymentType = form.get("cardPaymentType") as CardPaymentType;
    if (cardPaymentType !== "credit" && cardPaymentType !== "debit") {
      window.alert("Informe se foi crédito ou débito.");
      return;
    }

    setState({
      ...state,
      transactions: [
        {
          id: createId("txn"),
          description: String(form.get("description")),
          type: "expense",
          amount: Number(form.get("amount")),
          date: String(form.get("date")),
          status: "paid",
          categoryId: String(form.get("categoryId")),
          accountId,
          cardPaymentType,
        },
        ...state.transactions,
      ],
    });
    event.currentTarget.reset();
  }

  function deleteTransaction(transactionId: string) {
    if (!window.confirm("Remover este lançamento?")) {
      return;
    }

    setState({
      ...state,
      transactions: state.transactions.filter((transaction) => transaction.id !== transactionId),
    });
  }

  return (
    <Panel
      layout="stack"
      title="Cartões"
      description="Somente lançamentos com valores (crédito/débito no cartão). Para incluir ou remover cartões, use Manutenção."
      icon={<CreditCard />}
    >
      <div className="min-w-0 space-y-8">
        {creditCards.length > 0 ? (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <FinanceForm onSubmit={addCardTransaction}>
              <Select
                name="cardPaymentType"
                label="Crédito ou débito"
                options={[
                  ["credit", "Crédito"],
                  ["debit", "Débito"],
                ]}
              />
              <CardAccountSelect accounts={creditCards} orderedNames={cardPanelOptionNames} />
              <Input name="description" label="Descrição" required />
              <Input name="amount" label="Valor" type="number" step="0.01" min="0" required />
              <Input name="date" label="Data" type="date" defaultValue={toDateInput()} required />
              <CategorySelect state={state} type="expense" />
              <SubmitButton>Adicionar no cartão</SubmitButton>
            </FinanceForm>
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Filtrar por cartão</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  value={cardFilter}
                  onChange={(event) => setCardFilter(event.target.value)}
                >
                  <option value="all">Todos os cartões</option>
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </label>
              <TransactionList
                accounts={state.accounts}
                onDelete={deleteTransaction}
                showCardMeta
                transactions={cardMonthTransactions}
              />
            </div>
          </div>
        ) : (
          <EmptyState text="Não há cartões cadastrados. Abra a aba Manutenção para adicionar contas de cartão de crédito; depois volte aqui para lançar valores." />
        )}
      </div>
    </Panel>
  );
}

function MaintenancePanel({
  state,
  setState,
}: {
  state: FinanceState;
  setState: (state: FinanceState) => void;
}) {
  const creditCards = useMemo(
    () => state.accounts.filter((account) => account.kind === "credit_card"),
    [state.accounts],
  );

  function addCardAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("cardName")).trim();
    if (!name) {
      return;
    }

    setState({
      ...state,
      accounts: [
        ...state.accounts,
        { id: createId("card"), name, kind: "credit_card", balance: 0 },
      ],
    });
    event.currentTarget.reset();
  }

  function removeCardAccount(accountId: string) {
    const inUse =
      state.transactions.some((transaction) => transaction.accountId === accountId) ||
      state.recurringItems.some((item) => item.accountId === accountId) ||
      state.installmentPlans.some((plan) => plan.accountId === accountId) ||
      state.loans.some((loan) => loan.accountId === accountId);

    if (inUse) {
      window.alert(
        "Não dá para remover este cartão porque há lançamentos, fixos, parcelas ou empréstimos usando ele.",
      );
      return;
    }

    if (!window.confirm("Remover este cartão da lista?")) {
      return;
    }

    setState({
      ...state,
      accounts: state.accounts.filter((account) => account.id !== accountId),
    });
  }

  return (
    <Panel
      layout="stack"
      title="Manutenção"
      description="Cadastro e ajustes que não são lançamentos de valores no dia a dia. Por enquanto: cartões de crédito (nome do banco e titular)."
      icon={<Wrench />}
    >
      <div className="min-w-0 space-y-8">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <h4 className="text-lg font-bold text-white">Cartões de crédito</h4>
          <p className="mt-1 text-sm text-slate-400">
            Inclua ou remova cartões (ex.: Santander - Gabriel). Os nomes aparecem na aba Cartões e nos
            relatórios. Não é possível remover um cartão que ainda tenha lançamentos ou vínculos em fixos,
            parcelas ou empréstimos.
          </p>
          <form className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={addCardAccount}>
            <div className="min-w-0 flex-1">
              <Input name="cardName" label="Nome do cartão" placeholder="Banco - Titular" required />
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15"
            >
              Adicionar cartão
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {creditCards.map((card) => (
              <li
                key={card.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3"
              >
                <span className="font-medium text-white">{card.name}</span>
                <button
                  type="button"
                  className="text-sm font-semibold text-rose-300 hover:text-rose-200"
                  onClick={() => removeCardAccount(card.id)}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
          {creditCards.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhum cartão. Adicione acima.</p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function RecurringPanel({
  state,
  setState,
}: {
  state: FinanceState;
  setState: (state: FinanceState) => void;
}) {
  function addRecurring(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const recurringItem = {
      id: createId("rec"),
      description: String(form.get("description")),
      type: form.get("type") as TransactionType,
      amount: Number(form.get("amount")),
      dayOfMonth: Number(form.get("dayOfMonth")),
      categoryId: String(form.get("categoryId")),
      accountId: String(form.get("accountId")),
      active: true,
    };
    const stateWithRecurring = {
      ...state,
      recurringItems: [recurringItem, ...state.recurringItems],
    };

    setState(generateRecurringForMonths(stateWithRecurring, currentMonth(), 12));
    event.currentTarget.reset();
  }

  function deleteRecurring(itemId: string) {
    if (!window.confirm("Remover este fixo e os lançamentos gerados por ele?")) {
      return;
    }

    setState({
      ...state,
      recurringItems: state.recurringItems.filter((item) => item.id !== itemId),
      transactions: state.transactions.filter((transaction) => transaction.sourceId !== itemId),
    });
  }

  return (
    <Panel
      title="Fixos"
      description="Cadastre aluguel, internet, salário e qualquer item que se repete todo mês."
      icon={<Repeat />}
    >
      <FinanceForm onSubmit={addRecurring}>
        <Select name="type" label="Tipo" options={[["income", "Entrada"], ["expense", "Saída"]]} />
        <Input name="description" label="Descrição" required />
        <Input name="amount" label="Valor mensal" type="number" step="0.01" min="0" required />
        <Input name="dayOfMonth" label="Dia do mês" type="number" min="1" max="28" required />
        <CategorySelect state={state} />
        <AccountSelect state={state} />
        <SubmitButton>Adicionar fixo</SubmitButton>
      </FinanceForm>
      <SimpleList
        items={state.recurringItems.map((item) => ({
          id: item.id,
          title: item.description,
          subtitle: `${item.type === "income" ? "Entrada" : "Saída"} todo dia ${item.dayOfMonth}`,
          value: formatCurrency(item.amount),
          onDelete: deleteRecurring,
        }))}
      />
    </Panel>
  );
}

function InstallmentsPanel({
  state,
  setState,
}: {
  state: FinanceState;
  setState: (state: FinanceState) => void;
}) {
  function addInstallment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const plan = {
      id: createId("parc"),
      description: String(form.get("description")),
      totalAmount: Number(form.get("totalAmount")),
      installments: Number(form.get("installments")),
      firstDueDate: String(form.get("firstDueDate")),
      categoryId: String(form.get("categoryId")),
      accountId: String(form.get("accountId")),
      paidInstallments: Number(form.get("paidInstallments")),
    };

    setState({
      ...state,
      installmentPlans: [plan, ...state.installmentPlans],
      transactions: [...buildInstallmentTransactions(plan), ...state.transactions],
    });
    event.currentTarget.reset();
  }

  function deleteInstallment(planId: string) {
    if (!window.confirm("Remover este parcelamento e todas as parcelas geradas?")) {
      return;
    }

    setState({
      ...state,
      installmentPlans: state.installmentPlans.filter((plan) => plan.id !== planId),
      transactions: state.transactions.filter((transaction) => transaction.sourceId !== planId),
    });
  }

  return (
    <Panel
      title="Parcelas"
      description="Cadastre compras parceladas e deixe as parcelas futuras já previstas."
      icon={<CreditCard />}
    >
      <FinanceForm onSubmit={addInstallment}>
        <Input name="description" label="Compra" required />
        <Input name="totalAmount" label="Valor total" type="number" step="0.01" min="0" required />
        <Input name="installments" label="Parcelas" type="number" min="1" required />
        <Input name="paidInstallments" label="Parcelas pagas" type="number" min="0" defaultValue="0" />
        <Input name="firstDueDate" label="Primeiro vencimento" type="date" required />
        <CategorySelect state={state} type="expense" />
        <AccountSelect state={state} />
        <SubmitButton>Adicionar parcelamento</SubmitButton>
      </FinanceForm>
      <SimpleList
        items={state.installmentPlans.map((plan) => ({
          id: plan.id,
          title: plan.description,
          subtitle: `${plan.paidInstallments}/${plan.installments} parcelas pagas`,
          value: formatCurrency(plan.totalAmount),
          onDelete: deleteInstallment,
        }))}
      />
    </Panel>
  );
}

function LoansPanel({
  state,
  setState,
}: {
  state: FinanceState;
  setState: (state: FinanceState) => void;
}) {
  function addLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const loan = {
      id: createId("loan"),
      description: String(form.get("description")),
      direction: form.get("direction") as "borrowed" | "lent",
      principal: Number(form.get("principal")),
      interestRate: Number(form.get("interestRate")),
      installments: Number(form.get("installments")),
      firstDueDate: String(form.get("firstDueDate")),
      counterparty: String(form.get("counterparty")),
      accountId: String(form.get("accountId")),
      categoryId: String(form.get("categoryId")),
      paidInstallments: Number(form.get("paidInstallments")),
    };

    setState({
      ...state,
      loans: [loan, ...state.loans],
      transactions: [...buildLoanTransactions(loan), ...state.transactions],
    });
    event.currentTarget.reset();
  }

  function deleteLoan(loanId: string) {
    if (!window.confirm("Remover este empréstimo e todas as parcelas geradas?")) {
      return;
    }

    setState({
      ...state,
      loans: state.loans.filter((loan) => loan.id !== loanId),
      transactions: state.transactions.filter((transaction) => transaction.sourceId !== loanId),
    });
  }

  return (
    <Panel
      title="Empréstimos"
      description="Controle dinheiro emprestado ou tomado, com juros e saldo previsto."
      icon={<Landmark />}
    >
      <FinanceForm onSubmit={addLoan}>
        <Select
          name="direction"
          label="Direção"
          options={[["borrowed", "Peguei emprestado"], ["lent", "Emprestei para alguém"]]}
        />
        <Input name="description" label="Descrição" required />
        <Input name="counterparty" label="Pessoa ou instituição" required />
        <Input name="principal" label="Valor principal" type="number" step="0.01" min="0" required />
        <Input name="interestRate" label="Juros ao mês (%)" type="number" step="0.01" defaultValue="0" />
        <Input name="installments" label="Parcelas" type="number" min="1" required />
        <Input name="paidInstallments" label="Parcelas pagas" type="number" min="0" defaultValue="0" />
        <Input name="firstDueDate" label="Primeiro vencimento" type="date" required />
        <CategorySelect state={state} />
        <AccountSelect state={state} />
        <SubmitButton>Adicionar empréstimo</SubmitButton>
      </FinanceForm>
      <SimpleList
        items={state.loans.map((loan) => ({
          id: loan.id,
          title: loan.description,
          subtitle: `${loan.counterparty} - ${loan.paidInstallments}/${loan.installments} parcelas`,
          value: formatCurrency(loan.principal),
          onDelete: deleteLoan,
        }))}
      />
    </Panel>
  );
}

function Panel({
  title,
  description,
  icon,
  children,
  layout = "split",
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  /** split: duas colunas no XL (formulário + lista). stack: uma coluna (ex.: Cartões). */
  layout?: "split" | "stack";
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="rounded-2xl bg-emerald-400 p-3 text-slate-950">{icon}</div>
        <div>
          <h3 className="text-2xl font-bold">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
      </div>
      <div
        className={cn(
          "grid items-start gap-6",
          layout === "split" ? "xl:grid-cols-[0.9fr_1.1fr]" : "grid-cols-1",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function FinanceForm({
  children,
  onSubmit,
}: {
  children: React.ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="flex flex-col gap-4 rounded-3xl bg-slate-950/70 p-5" onSubmit={onSubmit}>
      {children}
    </form>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        {...inputProps}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <select
        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
        name={name}
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function CategorySelect({ state, type }: { state: FinanceState; type?: TransactionType }) {
  const categories = type
    ? state.categories.filter((category) => category.type === type)
    : state.categories;
  return <Select name="categoryId" label="Categoria" options={categories.map((c) => [c.id, c.name])} />;
}

function AccountSelect({ state }: { state: FinanceState }) {
  return <Select name="accountId" label="Conta" options={state.accounts.map((a) => [a.id, a.name])} />;
}

function CardAccountSelect({
  accounts,
  orderedNames,
}: {
  accounts: FinanceState["accounts"];
  orderedNames?: readonly string[];
}) {
  let options: [string, string][] = accounts.map((account) => [account.id, account.name]);
  if (orderedNames?.length) {
    const ordered = orderedNames
      .map((name) => {
        const account = accounts.find((item) => item.name === name);
        return account ? ([account.id, account.name] as [string, string]) : null;
      })
      .filter((row): row is [string, string] => row != null);
    if (ordered.length > 0) {
      options = ordered;
    }
  }

  if (options.length === 0) {
    return (
      <label className="block">
        <span className="text-sm font-medium text-slate-300">Cartão</span>
        <select
          disabled
          className="mt-2 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-slate-500 outline-none"
          name="accountId"
        >
          <option value="">Cadastre um cartão acima</option>
        </select>
      </label>
    );
  }
  return <Select name="accountId" label="Cartão" options={options} />;
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-slate-950" type="submit">
      {children}
    </button>
  );
}

function TransactionList({
  accounts,
  onDelete,
  showCardMeta = false,
  transactions,
}: {
  accounts?: FinanceState["accounts"];
  onDelete?: (transactionId: string) => void;
  showCardMeta?: boolean;
  transactions: FinanceState["transactions"];
}) {
  if (transactions.length === 0) {
    return <EmptyState text="Nenhum lançamento ainda. Cadastre o primeiro para ver os relatórios." />;
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const account = accounts?.find((item) => item.id === transaction.accountId);
        const cardMeta =
          showCardMeta && account
            ? `${account.name}${
                transaction.cardPaymentType
                  ? transaction.cardPaymentType === "credit"
                    ? " · Crédito"
                    : " · Débito"
                  : ""
              }`
            : null;

        return (
        <div key={transaction.id} className="rounded-2xl bg-slate-950/70 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{transaction.description}</p>
              <p className="text-sm text-slate-400">
                {new Date(`${transaction.date}T00:00:00`).toLocaleDateString("pt-BR")} -{" "}
                {transaction.status === "paid" ? "Pago" : "Pendente"}
              </p>
              {cardMeta ? <p className="mt-1 text-xs text-slate-500">{cardMeta}</p> : null}
            </div>
            <p
              className={cn(
                "font-bold",
                transaction.type === "income" ? "text-emerald-300" : "text-rose-300",
              )}
            >
              {transaction.type === "income" ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </p>
          </div>
          {onDelete ? (
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-400/30 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
              type="button"
              onClick={() => onDelete(transaction.id)}
            >
              <Trash2 size={16} />
              Remover
            </button>
          ) : null}
        </div>
        );
      })}
    </div>
  );
}

function SimpleList({
  items,
}: {
  items: {
    id: string;
    onDelete?: (itemId: string) => void;
    title: string;
    subtitle: string;
    value: string;
  }[];
}) {
  if (items.length === 0) {
    return <EmptyState text="Nada cadastrado aqui ainda." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl bg-slate-950/70 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-slate-400">{item.subtitle}</p>
            </div>
            <p className="font-bold">{item.value}</p>
          </div>
          {item.onDelete ? (
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-400/30 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
              type="button"
              onClick={() => item.onDelete?.(item.id)}
            >
              <Trash2 size={16} />
              Remover
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-slate-400">
      {text}
    </div>
  );
}
