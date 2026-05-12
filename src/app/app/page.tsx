import { FinanceApp } from "@/components/FinanceApp";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AppPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return <FinanceApp userEmail={user?.email} />;
}
