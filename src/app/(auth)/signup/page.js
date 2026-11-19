import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { TRIAL_DAYS } from "@/lib/hotel-access";

export const metadata = { title: "Register your hotel" };

export default function SignupPage() {
  return (
    <AuthShell title="Register your hotel" subtitle={`Start your ${TRIAL_DAYS}-day free trial. You'll be the hotel's administrator.`}>
      <SignupForm />
    </AuthShell>
  );
}
