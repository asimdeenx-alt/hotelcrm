"use client";

import { useState } from "react";
import { Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";
import { DEPARTMENTS } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";

/** Add (no `employee`) or edit an employee record. */
export function EmployeeFormDialog({ employee }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);
  const e = employee ?? {};

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await request(employee ? `/api/employees/${employee.id}` : "/api/employees", {
        method: employee ? "PATCH" : "POST",
        body: formToObject(event.currentTarget),
        success: employee ? "Employee updated" : "Employee added",
      });
      setOpen(false);
    } catch {}
  }

  const text = (name, label, props = {}) => (
    <FormField label={label} htmlFor={`emp-${name}`}>
      <Input id={`emp-${name}`} name={name} defaultValue={e[name] ?? ""} {...props} />
    </FormField>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {employee ? (
          <Button size="icon" variant="ghost" className="size-8" aria-label={`Edit ${employee.name}`}>
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button>
            <UserPlus /> Add employee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee ? `Edit ${employee.name}` : "Add employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          {text("name", "Full name", { required: true })}
          {text("designation", "Designation", { placeholder: "Receptionist, Chef, Room boy…" })}
          <FormField label="Department" htmlFor="emp-dept">
            <NativeSelect id="emp-dept" name="department" defaultValue={e.department ?? "Front Office"}>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </NativeSelect>
          </FormField>
          {text("monthlySalary", "Monthly salary", { type: "number", min: 0, step: "0.01", required: true })}
          {text("phone", "Phone")}
          {text("email", "Email", { type: "email" })}
          <FormField label="Joining date" htmlFor="emp-join">
            <Input id="emp-join" name="joinDate" type="date" defaultValue={toDateInput(e.joinDate)} />
          </FormField>
          {text("idNumber", "Aadhaar / ID number")}
          {text("bankAccount", "Bank account / UPI")}
          <FormField label="Address" htmlFor="emp-address" className="sm:col-span-2">
            <Textarea id="emp-address" name="address" rows={2} defaultValue={e.address ?? ""} />
          </FormField>
          <FormField label="Notes" htmlFor="emp-notes" className="sm:col-span-2">
            <Textarea id="emp-notes" name="notes" rows={2} defaultValue={e.notes ?? ""} />
          </FormField>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="active" defaultChecked={e.active ?? true} className="size-4 accent-primary" />
            Currently working (included in attendance and salary)
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {employee ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
