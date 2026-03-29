const requiredPublic = ["NEXT_PUBLIC_SUPABASE_URL"] as const;

for (const key of requiredPublic) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    "",
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_KEY ??
    process.env.Supabase_KEY ??
    "",
  // Database configuration
  databaseUrl: process.env.DATABASE_URL ?? "",
  databasePoolUrl: process.env.DATABASE_POOL_URL ?? "",
  // Payment configuration
  paymentMethod: process.env.NEXT_PUBLIC_PAYMENT_METHOD ?? "cash", // 'cash' | 'bank' | 'stripe'
  bankApiUrl: process.env.BANK_API_URL ?? "",
  bankApiKey: process.env.BANK_API_KEY ?? "",
};

if (!env.supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)",
  );
}
