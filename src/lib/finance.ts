import {
  FinanceState,
  InstallmentPlan,
  Loan,
  MonthlySummary,
  RecurringItem,
  Transaction,
} from "@/lib/types";

const colors = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"];

export const defaultFinanceState: FinanceState = {
  accounts: [
    { id: "acc-main", name: "Conta principal", kind: "checking", balance: 0 },
    { id: "acc-card-sant-gab", name: "Santander - Gabriel", kind: "credit_card", balance: 0 },
    { id: "acc-card-sant-maria", name: "Santander - Maria", kind: "credit_card", balance: 0 },
    { id: "acc-card-nu-gab", name: "Nubank - Gabriel", kind: "credit_card", balance: 0 },
    { id: "acc-card-nu-maria", name: "Nubank - Maria", kind: "credit_card", balance: 0 },
    { id: "acc-card-bb-maria", name: "Banco do Brasil - Maria", kind: "credit_card", balance: 0 },
  ],
  categories: [
    { id: "cat-salary", name: "Salário", type: "income", color: colors[0] },
    { id: "cat-extra", name: "Renda extra", type: "income", color: colors[3] },
    { id: "cat-home", name: "Casa", type: "expense", color: colors[1] },
    { id: "cat-food", name: "Alimentação", type: "expense", color: colors[2] },
    { id: "cat-loan", name: "Empréstimos", type: "expense", color: colors[4] },
  ],
  transactions: [],
  recurringItems: [],
  installmentPlans: [],
  loans: [],
};

/** Contas de cartão que vêm no estado inicial (Santander, Nubank, BB, etc.). */
const defaultCreditCardAccounts = defaultFinanceState.accounts.filter(
  (account) => account.kind === "credit_card",
);

/**
 * Garante que exista pelo menos um cartão de crédito na lista de contas.
 * Dados antigos (nuvem ou localStorage) muitas vezes só tinham "Conta principal",
 * o que escondia o seletor de banco/cartão na aba Cartões.
 */
export function ensureCreditCardAccounts(state: FinanceState): FinanceState {
  if (state.accounts.some((account) => account.kind === "credit_card")) {
    return state;
  }
  return {
    ...state,
    accounts: [...state.accounts, ...defaultCreditCardAccounts.map((account) => ({ ...account }))],
  };
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function monthOf(date: string) {
  return date.slice(0, 7);
}

export function addMonths(date: string, offset: number) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setMonth(parsed.getMonth() + offset);
  return parsed.toISOString().slice(0, 10);
}

export function getTransactionsForMonth(
  transactions: Transaction[],
  month: string,
) {
  return transactions.filter((transaction) => monthOf(transaction.date) === month);
}

export function summarizeTransactions(
  transactions: Transaction[],
  options: { includePending?: boolean } = {},
) {
  return transactions.reduce(
    (summary, transaction) => {
      if (!options.includePending && transaction.status !== "paid") {
        return summary;
      }

      if (transaction.type === "income") {
        summary.income += transaction.amount;
      } else {
        summary.expense += transaction.amount;
      }

      summary.balance = summary.income - summary.expense;
      return summary;
    },
    { income: 0, expense: 0, balance: 0 },
  );
}

export function buildAnnualSummary(
  transactions: Transaction[],
  year: number,
): MonthlySummary[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const summary = summarizeTransactions(getTransactionsForMonth(transactions, month), {
      includePending: true,
    });
    return { month, ...summary };
  });
}

export function buildRecurringTransaction(
  item: RecurringItem,
  month: string,
): Transaction {
  const day = String(item.dayOfMonth).padStart(2, "0");
  return {
    id: createId("txn"),
    description: item.description,
    type: item.type,
    amount: item.amount,
    date: `${month}-${day}`,
    dueDate: `${month}-${day}`,
    status: "pending",
    categoryId: item.categoryId,
    accountId: item.accountId,
    sourceId: item.id,
    sourceType: "recurring",
  };
}

export function buildInstallmentTransactions(plan: InstallmentPlan): Transaction[] {
  const amount = roundMoney(plan.totalAmount / plan.installments);

  return Array.from({ length: plan.installments }, (_, index) => ({
    id: createId("txn"),
    description: `${plan.description} (${index + 1}/${plan.installments})`,
    type: "expense",
    amount,
    date: addMonths(plan.firstDueDate, index),
    dueDate: addMonths(plan.firstDueDate, index),
    status: index < plan.paidInstallments ? "paid" : "pending",
    categoryId: plan.categoryId,
    accountId: plan.accountId,
    sourceId: plan.id,
    sourceType: "installment",
  }));
}

export function calculateLoanPayment(loan: Loan) {
  const monthlyRate = loan.interestRate / 100;

  if (monthlyRate === 0) {
    return roundMoney(loan.principal / loan.installments);
  }

  const factor = Math.pow(1 + monthlyRate, loan.installments);
  return roundMoney((loan.principal * monthlyRate * factor) / (factor - 1));
}

export function buildLoanTransactions(loan: Loan): Transaction[] {
  const amount = calculateLoanPayment(loan);
  const type = loan.direction === "borrowed" ? "expense" : "income";

  return Array.from({ length: loan.installments }, (_, index) => ({
    id: createId("txn"),
    description: `${loan.description} (${index + 1}/${loan.installments})`,
    type,
    amount,
    date: addMonths(loan.firstDueDate, index),
    dueDate: addMonths(loan.firstDueDate, index),
    status: index < loan.paidInstallments ? "paid" : "pending",
    categoryId: loan.categoryId,
    accountId: loan.accountId,
    notes: loan.counterparty,
    sourceId: loan.id,
    sourceType: "loan",
  }));
}

export function generateRecurringForMonth(state: FinanceState, month: string) {
  const existingSourceKeys = new Set(
    state.transactions.map((transaction) => `${transaction.sourceId}:${monthOf(transaction.date)}`),
  );

  const generated = state.recurringItems
    .filter((item) => item.active)
    .filter((item) => !existingSourceKeys.has(`${item.id}:${month}`))
    .map((item) => buildRecurringTransaction(item, month));

  return {
    ...state,
    transactions: [...generated, ...state.transactions],
  };
}

export function generateRecurringForMonths(
  state: FinanceState,
  startMonth: string,
  months = 12,
) {
  return Array.from({ length: months }, (_, index) =>
    addMonths(`${startMonth}-01`, index).slice(0, 7),
  ).reduce((nextState, generatedMonth) => {
    return generateRecurringForMonth(nextState, generatedMonth);
  }, state);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
