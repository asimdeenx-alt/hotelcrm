"use client";

import { useState } from "react";
import { ChevronDown, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApi } from "@/hooks/use-api";
import { formatMoney } from "@/lib/format";

export function ReservationActions({ reservation, balance, role, currency }) {
  const { request, pending } = useApi();
  const [confirm, setConfirm] = useState(null); // { title, description, run, destructive }
  const base = `/api/reservations/${reservation.id}`;
  const isManager = ["ADMIN", "MANAGER"].includes(role);
  const upcoming = ["PENDING", "CONFIRMED"].includes(reservation.status);

  async function run(fn) {
    try {
      await fn();
      setConfirm(null);
    } catch {
      // toast shown by useApi
    }
  }

  const checkOut = (force) =>
    request(`${base}/check-out`, { method: "POST", body: { force }, success: "Guest checked out" });

  return (
    <>
      {upcoming && (
        <Button
          onClick={() => run(() => request(`${base}/check-in`, { method: "POST", success: "Guest checked in" }))}
          disabled={pending}
        >
          <LogIn /> Check in
        </Button>
      )}

      {reservation.status === "CHECKED_IN" && (
        <Button
          disabled={pending}
          onClick={() => {
            if (balance <= 0.009) return run(() => checkOut(false));
            setConfirm({
              title: "Outstanding balance",
              description: isManager
                ? `This folio still has ${formatMoney(balance, currency)} due. Check out anyway as a manager override?`
                : `This folio still has ${formatMoney(balance, currency)} due. Record payment before checking out, or ask a manager to override.`,
              run: isManager ? () => checkOut(true) : null,
              destructive: true,
              action: "Override & check out",
            });
          }}
        >
          <LogOut /> Check out
        </Button>
      )}

      {upcoming && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              More <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() =>
                setConfirm({
                  title: "Mark as no-show?",
                  description: "The room will be released for these dates.",
                  run: () => request(`${base}/cancel`, { method: "POST", body: { status: "NO_SHOW" }, success: "Marked as no-show" }),
                  action: "Mark no-show",
                })
              }
            >
              Mark no-show
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() =>
                setConfirm({
                  title: "Cancel this reservation?",
                  description: "The room will be released. This cannot be undone.",
                  run: () => request(`${base}/cancel`, { method: "POST", body: { status: "CANCELLED" }, success: "Reservation cancelled" }),
                  destructive: true,
                  action: "Cancel reservation",
                })
              }
            >
              Cancel reservation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Close
            </Button>
            {confirm?.run && (
              <Button variant={confirm.destructive ? "destructive" : "default"} disabled={pending} onClick={() => run(confirm.run)}>
                {confirm.action}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
