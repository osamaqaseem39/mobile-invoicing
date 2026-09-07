"use client";

import { useActionState } from "react";
import { Lock, Mail } from "lucide-react";
import { loginAction, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { company } from "@/lib/company";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue="admin@ads.local"
            autoComplete="username"
            className="pl-9"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="pl-9"
          />
        </div>
      </div>
      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-theme-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-theme-xs text-gray-500 dark:text-gray-400">
        {company.tradingName} staff access only
      </p>
    </form>
  );
}
