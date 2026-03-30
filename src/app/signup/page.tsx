import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { PremiumInput, PremiumButton, PremiumSelect, PremiumSectionTitle } from "@/components/ui/premium-components";

type SignUpPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolved = (await searchParams) ?? {};
  const errorParam = resolved.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const roleParam = resolved.role ?? "student"; // student, guardian, or both
  const role = Array.isArray(roleParam) ? roleParam[0] : roleParam;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 lg:px-8">
      <main className="grid w-full gap-5 lg:grid-cols-2">
        <section className="panel p-8 lg:p-10">
          <p className="chip">Arkali Solutions LMS</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-slate-900">
            Elite Learning Platform
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-700">
            Premium education management system designed for Pakistani schools with
            class-based learning, comprehensive exam tracking, and real-time notifications.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-bold text-blue-900">🎓 Class-Based</p>
              <p className="mt-1 text-xs text-blue-800">
                Organize by grade classes with dedicated class teachers
              </p>
            </div>
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4">
              <p className="text-sm font-bold text-purple-900">📝 Exams</p>
              <p className="mt-1 text-xs text-purple-800">
                Unit tests, mid-term, and final exams with grading
              </p>
            </div>
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-900">🔔 Notifications</p>
              <p className="mt-1 text-xs text-green-800">
                Real-time in-app alerts for assignments, grades, and announcements
              </p>
            </div>
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">👨‍👩‍👧 Guardian Portal</p>
              <p className="mt-1 text-xs text-amber-800">
                Parents can monitor student progress instantly
              </p>
            </div>
          </div>
        </section>

        <section className="panel p-8">
          <h2 className="section-heading">Create Account</h2>

          {error && (
            <p className="mt-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {decodeURIComponent(error)}
            </p>
          )}

          <form action={signUpAction} method="POST" className="mt-6 space-y-6">
            <input type="hidden" name="role" value={role} />

            {/* Student Registration Section */}
            {(role === "student" || role === "both") && (
              <fieldset className="space-y-4 border-b border-slate-200 pb-6">
                <legend className="text-lg font-semibold text-slate-900">
                  Student Information
                </legend>

                <div className="grid grid-cols-2 gap-4">
                  <PremiumInput placeholder="First Name *" name="student_first_name" type="text" className="col-span-1" required />
                  <PremiumInput placeholder="Last Name *" name="student_last_name" type="text" className="col-span-1" required />
                </div>

                <PremiumInput placeholder="Email Address *" name="student_email" type="email" required />

                <PremiumInput placeholder="Phone Number" name="student_phone" type="tel" />

                <div className="grid grid-cols-2 gap-4">
                  <PremiumInput placeholder="Date of Birth *" name="student_dob" type="date" className="col-span-1" required />
                  <PremiumInput placeholder="Father's Name *" name="student_father_name" type="text" className="col-span-1" required />
                </div>

                <PremiumInput placeholder="Mother's Name *" name="student_mother_name" type="text" required />

                <PremiumInput placeholder="Address" name="student_address" type="text" />

                <div className="grid grid-cols-2 gap-4">
                  <PremiumInput placeholder="City" name="student_city" type="text" className="col-span-1" />
                  <PremiumInput placeholder="National ID (CNIC)" name="student_national_id" type="text" className="col-span-1" />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Create Password *</label>
                  <PremiumInput placeholder="Min 6 characters" name="student_password" type="password" minLength={6} required />
                </div>
              </fieldset>
            )}

            {/* Guardian Registration Section */}
            {(role === "guardian" || role === "both") && (
              <fieldset className="space-y-4 border-b border-slate-200 pb-6">
                <legend className="text-lg font-semibold text-slate-900">
                  Guardian Information
                </legend>

                <div className="grid grid-cols-2 gap-4">
                  <PremiumInput placeholder="First Name *" name="guardian_first_name" type="text" className="col-span-1" required />
                  <PremiumInput placeholder="Last Name *" name="guardian_last_name" type="text" className="col-span-1" required />
                </div>

                <PremiumInput placeholder="Email Address *" name="guardian_email" type="email" required />

                <PremiumInput placeholder="Phone Number *" name="guardian_phone" type="tel" required />

                <div className="grid grid-cols-2 gap-4">
                  <PremiumInput placeholder="Date of Birth" name="guardian_dob" type="date" className="col-span-1" />
                  <PremiumSelect
                    name="guardian_relation"
                    options={[
                      { value: "Father", label: "Father" },
                      { value: "Mother", label: "Mother" },
                      { value: "Uncle", label: "Uncle" },
                      { value: "Aunt", label: "Aunt" },
                      { value: "Guardian", label: "Guardian" },
                    ]}
                    className="col-span-1"
                    required
                  />
                </div>

                <PremiumInput placeholder="National ID (CNIC)" name="guardian_national_id" type="text" />

                <PremiumInput placeholder="Address" name="guardian_address" type="text" />

                <div className="grid grid-cols-2 gap-4">
                  <PremiumInput placeholder="City" name="guardian_city" type="text" className="col-span-1" />
                  <PremiumInput placeholder="Occupation" name="guardian_occupation" type="text" className="col-span-1" />
                </div>

                {role === "both" ? (
                  <PremiumInput placeholder="Password (auto-generated)" name="guardian_password" type="password" disabled value="auto-generated" />
                ) : (
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Create Password *</label>
                    <PremiumInput placeholder="Min 6 characters" name="guardian_password" type="password" minLength={6} required />
                  </div>
                )}
              </fieldset>
            )}

            {/* Link information (shown when both student and guardian register) */}
            {role === "both" && (
              <fieldset className="space-y-4 border-b border-slate-200 pb-6">
                <legend className="text-lg font-semibold text-slate-900">
                  Link Guardian to Student
                </legend>
                <p className="text-sm text-slate-600">
                  The guardian account will be automatically linked to the student account during
                  registration.
                </p>
              </fieldset>
            )}

            <div className="space-y-2">
              <PremiumButton type="submit" variant="primary" size="lg" className="w-full">Create Account</PremiumButton>
              <p className="text-center text-sm text-slate-600">Have an account? <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">Sign In</Link></p>
            </div>
          </form>

          {/* Role Selection Helper */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-xs font-semibold text-slate-500 uppercase">Select registration type</p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/signup?role=student"
                className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-all ${
                  role === "student"
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Student Only
              </Link>
              <Link
                href="/signup?role=guardian"
                className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-all ${
                  role === "guardian"
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Guardian Only
              </Link>
              <Link
                href="/signup?role=both"
                className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-all ${
                  role === "both"
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Both
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
