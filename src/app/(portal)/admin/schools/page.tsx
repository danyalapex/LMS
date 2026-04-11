import AdminSchoolsClient from "@/components/admin/admin-schools-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface School {
  id: string;
  name: string;
  code: string;
  contact_email: string;
  status: string;
  created_at: string;
}

interface Subscription {
  id: string;
  organization_id: string;
  status: string;
  amount_pkr: number;
  ends_on: string | null;
  next_billing_date: string | null;
  subscription_plans: any[];
}

export default async function AdminSchoolsPage() {
  const supabase = createSupabaseAdminClient();

  const [schoolsRes, subsRes, plansRes] = await Promise.all([
    supabase.from("organizations").select("id,name,code,contact_email,status,created_at"),
    supabase.from("subscriptions").select("*"),
    supabase.from("subscription_plans").select("*").order("amount_pkr", { ascending: true }),
  ]);

  const schools: School[] = schoolsRes.data || [];
  const subscriptions: Subscription[] = subsRes.data || [];
  const plans: any[] = plansRes.data || [];

  return <AdminSchoolsClient initialSchools={schools} initialSubscriptions={subscriptions} initialPlans={plans} />;
}
