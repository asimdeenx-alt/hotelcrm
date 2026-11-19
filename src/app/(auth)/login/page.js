import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your hotel account.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
