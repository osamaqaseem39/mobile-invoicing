import { LoginForm } from "@/components/login-form";
import { company } from "@/lib/company";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white">
            {company.shortName[0]}
          </div>
          <div>
            <div className="text-theme-xs font-medium uppercase tracking-wider text-gray-400">
              {company.shortName}
            </div>
            <h1 className="text-theme-xl font-semibold text-gray-800 dark:text-white/90">
              Wholesale Ops
            </h1>
          </div>
        </div>
        <p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
          Sign in to manage stock, invoices, and suppliers.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
