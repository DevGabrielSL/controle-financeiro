-- Adiciona coluna para distinguir compras no crédito vs débito no cartão.
-- Execute no SQL Editor do Supabase se o projeto já existia antes desta mudança.

alter table public.transactions
  add column if not exists card_payment_type text
  check (card_payment_type is null or card_payment_type in ('credit', 'debit'));
