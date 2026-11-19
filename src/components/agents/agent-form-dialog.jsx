"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";

/** Create (no `agent`) or edit a travel agent / OTA. */
export function AgentFormDialog({ agent }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);
  const a = agent ?? {};

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await request(agent ? `/api/agents/${agent.id}` : "/api/agents", {
        method: agent ? "PATCH" : "POST",
        body: formToObject(event.currentTarget),
        success: agent ? "Agent updated" : "Agent added",
      });
      setOpen(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {agent ? (
          <Button variant="outline">
            <Pencil /> Edit agent
          </Button>
        ) : (
          <Button>
            <Plus /> Add agent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{agent ? `Edit ${agent.name}` : "Add travel agent / OTA"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Agency name" htmlFor="ag-name" className="sm:col-span-2">
            <Input id="ag-name" name="name" defaultValue={a.name ?? ""} required placeholder="MakeMyTrip, Booking.com, Sharma Travels…" />
          </FormField>
          <FormField label="Contact person" htmlFor="ag-contact">
            <Input id="ag-contact" name="contactPerson" defaultValue={a.contactPerson ?? ""} />
          </FormField>
          <FormField label="Phone" htmlFor="ag-phone">
            <Input id="ag-phone" name="phone" defaultValue={a.phone ?? ""} />
          </FormField>
          <FormField label="Email" htmlFor="ag-email" className="sm:col-span-2">
            <Input id="ag-email" name="email" type="email" defaultValue={a.email ?? ""} />
          </FormField>
          <FormField label="Commission %" htmlFor="ag-comm" hint="On room charges.">
            <Input id="ag-comm" name="commissionPct" type="number" min="0" max="100" step="0.01" defaultValue={a.commissionPct ?? 0} />
          </FormField>
          <FormField label="Opening balance" htmlFor="ag-open" hint="+ agent owes you, − you owe agent.">
            <Input id="ag-open" name="openingBalance" type="number" step="0.01" defaultValue={a.openingBalance ?? 0} />
          </FormField>
          <FormField label="Notes" htmlFor="ag-notes" className="sm:col-span-2">
            <Textarea id="ag-notes" name="notes" rows={2} defaultValue={a.notes ?? ""} />
          </FormField>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="active" defaultChecked={a.active ?? true} className="size-4 accent-primary" />
            Active (shown when booking)
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {agent ? "Save changes" : "Add agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
