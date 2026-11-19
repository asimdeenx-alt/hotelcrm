"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { formToObject, useApi } from "@/hooks/use-api";
import { formatDate } from "@/lib/dates";
import { humanize } from "@/lib/format";
import { ROLES } from "@/lib/permissions";

const ROLE_HINTS = {
  ADMIN: "Everything, including staff accounts.",
  MANAGER: "All operations, rooms, reports and settings.",
  RECEPTIONIST: "Reservations, guests, check-in/out and folios.",
  HOUSEKEEPING: "Room status and housekeeping tasks.",
  ACCOUNTANT: "Billing, reports and read-only reservations.",
};

export function StaffManager({ users, currentUserId }) {
  const { request, pending } = useApi();
  const [editing, setEditing] = useState(null); // {} for new

  async function onSubmit(event) {
    event.preventDefault();
    const body = formToObject(event.currentTarget);
    const isNew = !editing.id;
    try {
      await request(isNew ? "/api/users" : `/api/users/${editing.id}`, {
        method: isNew ? "POST" : "PATCH",
        body,
        success: isNew ? "Staff account created" : "Staff account updated",
      });
      setEditing(null);
    } catch {}
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({})}>
          <Plus /> Add staff
        </Button>
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Since</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className={u.active ? "" : "opacity-60"}>
                <TableCell className="pl-5 font-medium">
                  {u.name} {u.id === currentUserId && <span className="text-xs text-muted-foreground">(you)</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>{humanize(u.role)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <StatusBadge value={u.active ? "active" : "inactive"} label={u.active ? "Active" : "Inactive"} tone={u.active ? "success" : "muted"} />
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Edit ${editing.name}` : "Add staff account"}</DialogTitle>
            <DialogDescription>{editing?.id ? editing.email : "They will sign in with this email and password."}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form key={editing.id ?? "new"} onSubmit={onSubmit} className="grid gap-4">
              <FormField label="Full name" htmlFor="u-name">
                <Input id="u-name" name="name" defaultValue={editing.name ?? ""} required />
              </FormField>
              {!editing.id && (
                <FormField label="Email" htmlFor="u-email">
                  <Input id="u-email" name="email" type="email" required />
                </FormField>
              )}
              <RoleSelect defaultValue={editing.role ?? "RECEPTIONIST"} disabled={editing.id === currentUserId} />
              <FormField
                label={editing.id ? "New password" : "Password"}
                htmlFor="u-password"
                hint={editing.id ? "Leave blank to keep the current password." : "At least 8 characters."}
              >
                <Input id="u-password" name="password" type="password" minLength={8} required={!editing.id} autoComplete="new-password" />
              </FormField>
              {editing.id && editing.id !== currentUserId && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={editing.active} className="size-4 accent-primary" />
                  Account active
                </label>
              )}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {editing.id ? "Save changes" : "Create account"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


function RoleSelect({ defaultValue, disabled }) {
  const [role, setRole] = useState(defaultValue);
  return (
    <FormField label="Role" htmlFor="u-role" hint={ROLE_HINTS[role]}>
      <NativeSelect id="u-role" name="role" value={role} onChange={(e) => setRole(e.target.value)} disabled={disabled}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {humanize(r)}
          </option>
        ))}
      </NativeSelect>
    </FormField>
  );
}
