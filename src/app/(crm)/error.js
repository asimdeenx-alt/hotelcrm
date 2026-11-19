"use client";

import { Button } from "@/components/ui/button";

export default function CrmError({ error, reset }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Something went wrong</p>
      <h1 className="mt-2 font-display text-3xl">We couldn&apos;t load this page</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {error?.digest ? `Reference: ${error.digest}. ` : ""}Check the database connection and try again.
      </p>
      <Button className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
