"use client";

import { FinanceState } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export async function loadCloudFinanceState(): Promise<FinanceState | null> {
  const supabase = createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [
    accounts,
    categories,
    transactions,
    recurringItems,
    installmentPlans,
    loans,
  ] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at"),
    supabase.from("categories").select("*").order("created_at"),
    supabase.from("transactions").select("*").order("date", { ascending: false }),
    supabase.from("recurring_items").select("*").order("created_at"),
    supabase.from("installment_plans").select("*").order("created_at"),
    supabase.from("loans").select("*").order("created_at"),
  ]);

  const error =
    accounts.error ??
    categories.error ??
    transactions.error ??
    recurringItems.error ??
    installmentPlans.error ??
    loans.error;

  if (error) {
    throw error;
  }

  return {
    accounts: (accounts.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      balance: Number(row.balance),
    })),
    categories: (categories.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      color: row.color,
    })),
    transactions: (transactions.data ?? []).map((row) => ({
      id: row.id,
      description: row.description,
      type: row.type,
      amount: Number(row.amount),
      date: row.date,
      dueDate: row.due_date ?? undefined,
      status: row.status,
      categoryId: row.category_id,
      accountId: row.account_id,
      cardPaymentType: row.card_payment_type ?? undefined,
      notes: row.notes ?? undefined,
      sourceId: row.source_id ?? undefined,
      sourceType: row.source_type ?? undefined,
    })),
    recurringItems: (recurringItems.data ?? []).map((row) => ({
      id: row.id,
      description: row.description,
      type: row.type,
      amount: Number(row.amount),
      dayOfMonth: row.day_of_month,
      categoryId: row.category_id,
      accountId: row.account_id,
      active: row.active,
    })),
    installmentPlans: (installmentPlans.data ?? []).map((row) => ({
      id: row.id,
      description: row.description,
      totalAmount: Number(row.total_amount),
      installments: row.installments,
      firstDueDate: row.first_due_date,
      categoryId: row.category_id,
      accountId: row.account_id,
      paidInstallments: row.paid_installments,
    })),
    loans: (loans.data ?? []).map((row) => ({
      id: row.id,
      description: row.description,
      direction: row.direction,
      principal: Number(row.principal),
      interestRate: Number(row.interest_rate),
      installments: row.installments,
      firstDueDate: row.first_due_date,
      counterparty: row.counterparty,
      accountId: row.account_id,
      categoryId: row.category_id,
      paidInstallments: row.paid_installments,
    })),
  };
}

export async function saveCloudFinanceState(state: FinanceState) {
  const supabase = createClient();
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Faça login para salvar na nuvem.");
  }

  await deleteExistingRows(user.id);

  const accountRows = state.accounts.map((account) => ({
    id: account.id,
    user_id: user.id,
    name: account.name,
    kind: account.kind,
    balance: account.balance,
  }));
  const categoryRows = state.categories.map((category) => ({
    id: category.id,
    user_id: user.id,
    name: category.name,
    type: category.type,
    color: category.color,
  }));

  await insertRows("accounts", accountRows);
  await insertRows("categories", categoryRows);

  await insertRows(
    "transactions",
    state.transactions.map((transaction) => ({
      id: transaction.id,
      user_id: user.id,
      account_id: transaction.accountId,
      category_id: transaction.categoryId,
      description: transaction.description,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      due_date: transaction.dueDate ?? null,
      status: transaction.status,
      notes: transaction.notes ?? null,
      card_payment_type: transaction.cardPaymentType ?? null,
      source_id: transaction.sourceId ?? null,
      source_type: transaction.sourceType ?? null,
    })),
  );
  await insertRows(
    "recurring_items",
    state.recurringItems.map((item) => ({
      id: item.id,
      user_id: user.id,
      account_id: item.accountId,
      category_id: item.categoryId,
      description: item.description,
      type: item.type,
      amount: item.amount,
      day_of_month: item.dayOfMonth,
      active: item.active,
    })),
  );
  await insertRows(
    "installment_plans",
    state.installmentPlans.map((plan) => ({
      id: plan.id,
      user_id: user.id,
      account_id: plan.accountId,
      category_id: plan.categoryId,
      description: plan.description,
      total_amount: plan.totalAmount,
      installments: plan.installments,
      first_due_date: plan.firstDueDate,
      paid_installments: plan.paidInstallments,
    })),
  );
  await insertRows(
    "loans",
    state.loans.map((loan) => ({
      id: loan.id,
      user_id: user.id,
      account_id: loan.accountId,
      category_id: loan.categoryId,
      description: loan.description,
      direction: loan.direction,
      principal: loan.principal,
      interest_rate: loan.interestRate,
      installments: loan.installments,
      first_due_date: loan.firstDueDate,
      counterparty: loan.counterparty,
      paid_installments: loan.paidInstallments,
    })),
  );
}

async function deleteExistingRows(userId: string) {
  const supabase = createClient();
  if (!supabase) {
    return;
  }

  const tables = [
    "transactions",
    "recurring_items",
    "installment_plans",
    "loans",
    "accounts",
    "categories",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) {
      throw error;
    }
  }
}

async function insertRows(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return;
  }

  const supabase = createClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from(table).insert(rows);
  if (error) {
    throw error;
  }
}
