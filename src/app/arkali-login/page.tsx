import { signInArkaliAction } from "@/app/actions/arkali-auth";
import { PremiumButton, PremiumInput } from "@/components/ui/premium-components";

export default async function ArkaliLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-8">
      <main className="w-full">
        <section className="panel p-8">
          <p className="chip">Arkali Solutions</p>
          <h1 className="mt-4 text-3xl font-bold">Arkali Admin Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in with your Arkali staff account to access the Arkali console.</p>

          <div className="mt-6">
            <form action={signInArkaliAction} className="space-y-3">
              <PremiumInput name="email" type="email" placeholder="you@arkali.com" />
              <PremiumInput name="password" type="password" placeholder="Password" />
              <PremiumButton type="submit" variant="primary" size="md" className="w-full">Sign in to Arkali</PremiumButton>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
