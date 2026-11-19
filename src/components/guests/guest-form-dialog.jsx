"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";
import { GUEST_TIERS } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { humanize } from "@/lib/format";

/** Create a guest (no `guest` prop) or edit an existing one. */
export function GuestFormDialog({ guest }) {
  const router = useRouter();
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);
  const editing = Boolean(guest);
  const g = guest ?? {};

  async function onSubmit(event) {
    event.preventDefault();
    try {
      const saved = await request(editing ? `/api/guests/${g.id}` : "/api/guests", {
        method: editing ? "PATCH" : "POST",
        body: formToObject(event.currentTarget),
        success: editing ? "Guest updated" : "Guest created",
      });
      setOpen(false);
      if (!editing) router.push(`/guests/${saved.id}`);
    } catch {}
  }

  const text = (name, label, props = {}) => (
    <FormField label={label} htmlFor={`guest-${name}`}>
      <Input id={`guest-${name}`} name={name} defaultValue={g[name] ?? ""} {...props} />
    </FormField>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline">
            <Pencil /> Edit profile
          </Button>
        ) : (
          <Button>
            <UserPlus /> New guest
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit guest profile" : "New guest profile"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          {text("firstName", "First name", { required: true })}
          {text("lastName", "Last name", { required: true })}
          {text("email", "Email", { type: "email" })}
          {text("phone", "Phone")}
          {text("company", "Company")}
          {text("nationality", "Nationality")}
          {text("idType", "ID type", { placeholder: "Passport, national ID…" })}
          {text("idNumber", "ID number")}
          <FormField label="Date of birth" htmlFor="guest-dob">
            <Input id="guest-dob" name="dateOfBirth" type="date" defaultValue={toDateInput(g.dateOfBirth)} />
          </FormField>
          <FormField label="Tier" htmlFor="guest-tier">
            <NativeSelect id="guest-tier" name="tier" defaultValue={g.tier ?? "REGULAR"}>
              {GUEST_TIERS.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Address" htmlFor="guest-address" className="sm:col-span-2">
            <Textarea id="guest-address" name="address" rows={2} defaultValue={g.address ?? ""} />
          </FormField>
          <FormField label="Preferences" htmlFor="guest-pref" className="sm:col-span-2" hint="Pillow type, floor, dietary needs, newspaper…">
            <Textarea id="guest-pref" name="preferences" rows={2} defaultValue={g.preferences ?? ""} />
          </FormField>
          <FormField label="Internal notes" htmlFor="guest-notes" className="sm:col-span-2">
            <Textarea id="guest-notes" name="notes" rows={2} defaultValue={g.notes ?? ""} />
          </FormField>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="vip" defaultChecked={Boolean(g.vip)} className="size-4 accent-primary" />
            VIP guest
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {editing ? "Save changes" : "Create guest"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
