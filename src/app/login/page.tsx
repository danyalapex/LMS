import Link from "next/link";
import { signInAction, signUpAction } from "@/app/actions/auth";
import {
  PremiumButton,
  PremiumInput,
  PremiumSelect,
} from "@/components/ui/premium-components";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolved = (await searchParams) ?? {};
  const errorParam = resolved.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 lg:px-8">
      <main className="grid w-full gap-5 lg:grid-cols-2">
        <section className="panel p-8 lg:p-10">
          <p className="chip">Arkali Solutions LMS</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-slate-900">
            Full-Scope Learning Management and Operations Platform
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-700">
            Unified system for academics, attendance, payroll, staff operations,
            and role-based governance powered by Next.js and Supabase.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[color:var(--border)] bg-white/80 p-4">
              <p className="text-sm font-semibold">Admin</p>
              <p className="mt-1 text-sm text-slate-600">Finance, users, compliance</p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-white/80 p-4">
              <p className="text-sm font-semibold">Teacher</p>
              <p className="mt-1 text-sm text-slate-600">Classroom and grading tools</p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-white/80 p-4">
              <p className="text-sm font-semibold">Student</p>
              <p className="mt-1 text-sm text-slate-600">Progress and timeline</p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-white/80 p-4">
              <p className="text-sm font-semibold">Guardian</p>
              <p className="mt-1 text-sm text-slate-600">Visibility and alerts</p>
            </div>
          </div>
        </section>

        <section className="panel p-8">
          <h2 className="section-heading">Account Access</h2>
          {error ? (
            <p className="mt-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {decodeURIComponent(error)}
            </p>
          ) : null}

          <div className="mt-5 space-y-5">
            <form action={signInAction} className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">Sign in</p>
              <PremiumInput name="email" type="email" placeholder="you@school.edu" />
              <PremiumInput name="password" type="password" placeholder="Password" />
              <PremiumButton type="submit" variant="primary" size="md" className="w-full">Sign In</PremiumButton>
            </form>

            <form action={signUpAction} className="space-y-3 rounded-xl border border-[color:var(--border)] bg-white/70 p-4">
              <p className="text-sm font-semibold text-slate-700">Create account</p>
              <PremiumInput name="full_name" type="text" placeholder="Full name" required />
              <PremiumInput name="email" type="email" placeholder="Email" required />
              <PremiumInput name="password" type="password" minLength={8} placeholder="Password (8+ chars)" required />
              <PremiumSelect
                name="role"
                options={[
                  { value: "student", label: "Student" },
                  { value: "teacher", label: "Teacher" },
                  { value: "admin", label: "Administrator" },
                  { value: "guardian", label: "Guardian" },
                  { value: "finance", label: "Finance" },
                ]}
                defaultValue="student"
              />
              <PremiumButton type="submit" variant="secondary" size="md" className="w-full">Create Account</PremiumButton>
            </form>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            By continuing, you agree to Arkali policies. Need enterprise SSO? Contact admin.
          </p>
          <Link href="/" className="mt-4 inline-block text-xs font-semibold text-slate-700 underline">
            Refresh Session
          </Link>
        </section>
      </main>
    </div>
  );
}
