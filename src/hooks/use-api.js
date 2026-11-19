"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Small fetch wrapper for calling the CRM's Route Handlers from Client Components.
 * Shows a toast on success/failure and refreshes Server Component data by default.
 *
 * @example
 * const { request, pending } = useApi();
 * await request("/api/guests", { method: "POST", body: form, success: "Guest saved" });
 */
export function useApi() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const request = useCallback(
    async (url, { method = "GET", body, success, refresh = true, silent = false } = {}) => {
      setPending(true);
      try {
        const res = await fetch(url, {
          method,
          headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) router.push("/login");
          throw new Error(data.error || `Request failed (${res.status})`);
        }
        if (success) toast.success(success);
        if (refresh) router.refresh();
        return data;
      } catch (error) {
        if (!silent) toast.error(error.message);
        throw error;
      } finally {
        setPending(false);
      }
    },
    [router]
  );

  return { request, pending };
}

/** Collects a <form>'s fields into a plain object (checkboxes become booleans). */
export function formToObject(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === "checkbox") data[el.name] = el.checked;
    else if (el.type === "radio") {
      if (el.checked) data[el.name] = el.value;
    } else data[el.name] = el.value;
  }
  return data;
}
