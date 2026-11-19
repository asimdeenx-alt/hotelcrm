"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelName: form.get("hotelName"),
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          password: form.get("password"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not register the hotel.");
      router.push(data.home || "/");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <FormField label="Hotel name" htmlFor="hotelName">
        <Input id="hotelName" name="hotelName" required minLength={2} autoFocus placeholder="e.g. Pearl Continental Lahore" />
      </FormField>
      <FormField label="Your full name" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required minLength={2} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </FormField>
        <FormField label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </FormField>
      </div>
      <FormField label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </FormField>
      <FormField label="Confirm password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </FormField>
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-2 h-10">
        {pending && <Loader2 className="animate-spin" />}
        Create hotel account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
