export type TransactionType = "income" | "expense";
export type TransactionStatus = "paid" | "pending";
export type CardPaymentType = "credit" | "debit";
export type AccountKind = "checking" | "savings" | "cash" | "credit_card";
export type LoanDirection = "borrowed" | "lent";

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  balance: number;
};

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
};

export type Transaction = {
  id: string;
  description: string;
  type: TransactionType;
  amount: number;
  date: string;
  dueDate?: string;
  status: TransactionStatus;
  categoryId: string;
  accountId: string;
  /** Presente em lançamentos feitos na aba Cartões (crédito x débito no cartão). */
  cardPaymentType?: CardPaymentType;
  notes?: string;
  sourceId?: string;
  sourceType?: "recurring" | "installment" | "loan";
};

export type RecurringItem = {
  id: string;
  description: string;
  type: TransactionType;
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  accountId: string;
  active: boolean;
};

export type InstallmentPlan = {
  id: string;
  description: string;
  totalAmount: number;
  installments: number;
  firstDueDate: string;
  categoryId: string;
  accountId: string;
  paidInstallments: number;
};

export type Loan = {
  id: string;
  description: string;
  direction: LoanDirection;
  principal: number;
  interestRate: number;
  installments: number;
  firstDueDate: string;
  counterparty: string;
  accountId: string;
  categoryId: string;
  paidInstallments: number;
};

export type FinanceState = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurringItems: RecurringItem[];
  installmentPlans: InstallmentPlan[];
  loans: Loan[];
};

export type MonthlySummary = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};
