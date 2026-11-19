import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getContext } from "@/lib/auth";

export const metadata = { title: "Account unavailable" };
export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (!ctx.blocked) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{ctx.hotel?.name ?? "Hotel CRM"}</p>
        <h1 className="mt-2 font-display text-4xl">Account unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">{ctx.blocked}</p>
        <p className="mt-1 text-sm text-muted-foreground">Your data is safe and will be available again once the account is reactivated.</p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
