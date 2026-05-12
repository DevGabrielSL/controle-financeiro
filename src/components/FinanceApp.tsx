"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import {
  buildAnnualSummary,
  buildInstallmentTransactions,
  buildLoanTransactions,
  createId,
  defaultFinanceState,
  generateRecurringForMonths,
  getTransactionsForMonth,
  summarizeTransactions,
} from "@/lib/finance";
import { FinanceState, TransactionStatus, TransactionType } from "@/lib/types";
import { cn, currentMonth, formatCurrency, formatMonth, toDateInput } from "@/lib/utils";
import {
  loadCloudFinanceState,
  saveCloudFinanceState,
} from "@/lib/supabase/finance-sync";

const storageKey = "controle-financeiro-state";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "transactions", label: "Entradas e saídas" },
  { id: "recurring", label: "Fixos" },
  { id: "installments", label: "Parcelas" },
  { id: "loans", label: "Empréstimos" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function FinanceApp({ userEmail }: { userEmail?: string }) {
  const [state, setState] = useState<FinanceState>(() => {
    if (typeof window === "undefined") {
      return defaultFinanceState;
    }

    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultFinanceState;
  });
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [month, setMonth] = useState(currentMonth());
  const [syncStatus, setSyncStatus] = useState("Dados locais prontos.");

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

  async function loadFromCloud() {
    try {
      setSyncStatus("Carregando da nuvem...");
      const cloudState = await loadCloudFinanceState();
      if (!cloudState) {
        setSyncStatus("Faça login e configure o Supabase para carregar da nuvem.");
        return;
      }
      setState(cloudState);
      setSyncStatus("Dados carregados da nuvem.");
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Erro ao carregar da nuvem.");
    }
  }

  async function saveToCloud() {
    try {
      setSyncStatus("Salvando na nuvem...");
      await saveCloudFinanceState(state);
      setSyncStatus("Dados salvos na nuvem.");
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Erro ao salvar na nuvem.");
    }
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
              <button
                className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-white"
                type="button"
                onClick={loadFromCloud}
              >
                Carregar nuvem
              </button>
              <button
                className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-white"
                type="button"
                onClick={saveToCloud}
              >
                Salvar nuvem
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-400">{syncStatus}</p>

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
              transactions={monthlyTransactions}
              onDeleteTransaction={deleteTransaction}
            />
          ) : null}
          {activeTab === "transactions" ? (
            <TransactionsPanel state={state} setState={updateState} />
          ) : null}
          {activeTab === "recurring" ? (
            <RecurringPanel state={state} setState={updateState} />
          ) : null}
          {activeTab === "installments" ? (
            <InstallmentsPanel state={state} setState={updateState} />
          ) : null}
          {activeTab === "loans" ? <LoansPanel state={state} setState={updateState} /> : null}
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
  onDeleteTransaction,
  transactions,
}: {
  annualSummary: ReturnType<typeof buildAnnualSummary>;
  onDeleteTransaction: (transactionId: string) => void;
  transactions: FinanceState["transactions"];
}) {
  const chartData = annualSummary.map((summary) => ({
    name: summary.month.slice(5),
    Entradas: summary.income,
    Saídas: summary.expense,
  }));

  return (
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
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
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
      <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">{children}</div>
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

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-slate-950" type="submit">
      {children}
    </button>
  );
}

function TransactionList({
  onDelete,
  transactions,
}: {
  onDelete?: (transactionId: string) => void;
  transactions: FinanceState["transactions"];
}) {
  if (transactions.length === 0) {
    return <EmptyState text="Nenhum lançamento ainda. Cadastre o primeiro para ver os relatórios." />;
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="rounded-2xl bg-slate-950/70 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{transaction.description}</p>
              <p className="text-sm text-slate-400">
                {new Date(`${transaction.date}T00:00:00`).toLocaleDateString("pt-BR")} -{" "}
                {transaction.status === "paid" ? "Pago" : "Pendente"}
              </p>
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
      ))}
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
