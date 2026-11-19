"use client";

import { useState } from "react";
import { Check, Play, Plus, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, NativeSelect } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { formToObject, useApi } from "@/hooks/use-api";
import { TASK_PRIORITIES } from "@/lib/constants";
import { formatDate, toDateInput, todayDateOnly } from "@/lib/dates";
import { humanize } from "@/lib/format";

const COLUMNS = [
  { status: "PENDING", title: "To do" },
  { status: "IN_PROGRESS", title: "In progress" },
  { status: "DONE", title: "Done (last 3 days)" },
];

const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

export function TaskBoard({ tasks, rooms, staff }) {
  const { request, pending } = useApi();
  const [open, setOpen] = useState(false);

  const update = (task, body, success) =>
    request(`/api/housekeeping/${task.id}`, { method: "PATCH", body, success }).catch(() => {});

  async function onCreate(event) {
    event.preventDefault();
    try {
      await request("/api/housekeeping", { method: "POST", body: formToObject(event.currentTarget), success: "Task created" });
      setOpen(false);
    } catch {}
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus /> New task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New housekeeping task</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Task" htmlFor="t-title" className="sm:col-span-2">
                <Input id="t-title" name="title" required placeholder="Turndown service, replace minibar…" />
              </FormField>
              <FormField label="Room" htmlFor="t-room">
                <NativeSelect id="t-room" name="roomId" required>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.number} · {humanize(r.status)}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Priority" htmlFor="t-priority">
                <NativeSelect id="t-priority" name="priority" defaultValue="NORMAL">
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {humanize(p)}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Assign to" htmlFor="t-assignee">
                <NativeSelect id="t-assignee" name="assignedToId" defaultValue="">
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Due" htmlFor="t-due">
                <Input id="t-due" name="dueDate" type="date" defaultValue={toDateInput(todayDateOnly())} />
              </FormField>
              <FormField label="Notes" htmlFor="t-notes" className="sm:col-span-2">
                <Textarea id="t-notes" name="notes" rows={2} />
              </FormField>
              <DialogFooter className="sm:col-span-2">
                <Button type="submit" disabled={pending}>
                  Create task
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = tasks
            .filter((t) => t.status === col.status)
            .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
          return (
            <section key={col.status} className="rounded-xl bg-muted/50 p-3">
              <h2 className="flex items-center justify-between px-1 pb-3 text-sm font-medium">
                {col.title}
                <span className="tabular-nums text-muted-foreground">{list.length}</span>
              </h2>
              <div className="space-y-2.5">
                {list.map((task) => (
                  <article key={task.id} className="rounded-lg border bg-card p-3.5 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Room {task.room.number}
                          {task.dueDate && ` · due ${formatDate(task.dueDate)}`}
                        </p>
                      </div>
                      <StatusBadge value={task.priority} />
                    </div>
                    {task.notes && <p className="mt-2 text-xs text-muted-foreground">{task.notes}</p>}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <NativeSelect
                        aria-label="Assignee"
                        className="h-7 w-auto max-w-[55%] text-xs"
                        value={task.assignedTo?.id ?? ""}
                        disabled={pending}
                        onChange={(e) => update(task, { assignedToId: e.target.value }, "Task reassigned")}
                      >
                        <option value="">Unassigned</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </NativeSelect>
                      <div className="flex gap-1">
                        {task.status === "PENDING" && (
                          <Button size="sm" variant="outline" className="h-7" disabled={pending} onClick={() => update(task, { status: "IN_PROGRESS" })}>
                            <Play /> Start
                          </Button>
                        )}
                        {task.status !== "DONE" && (
                          <Button size="sm" className="h-7" disabled={pending} onClick={() => update(task, { status: "DONE" }, "Task completed")}>
                            <Check /> Done
                          </Button>
                        )}
                        {task.status === "DONE" && (
                          <Button size="sm" variant="ghost" className="h-7" disabled={pending} onClick={() => update(task, { status: "PENDING" })}>
                            <Undo2 /> Reopen
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          aria-label="Delete task"
                          disabled={pending}
                          onClick={() => request(`/api/housekeeping/${task.id}`, { method: "DELETE", success: "Task deleted" }).catch(() => {})}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
                {list.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nothing here.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
