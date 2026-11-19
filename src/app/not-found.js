import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">404</p>
      <h1 className="mt-2 font-display text-4xl">This page has checked out</h1>
      <p className="mt-3 text-sm text-muted-foreground">The record may have been removed, or the link is wrong.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
