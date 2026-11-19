import Link from "next/link";
import { CircleDollarSign, Plane, Wallet } from "lucide-react";
import { AgentFormDialog } from "@/components/agents/agent-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { agentBalance } from "@/lib/agents";
import { requirePageSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Travel agents" };

export default async function AgentsPage() {
  const session = await requirePageSession("agents");
  const prisma = forHotel(session.hotelId);
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);

  const agents = await prisma.travelAgent.findMany({
    include: {
      transactions: { select: { type: true, amount: true } },
      _count: { select: { reservations: true } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  const rows = agents.map((a) => ({ ...a, balance: agentBalance(a.openingBalance, a.transactions) }));
  const receivable = rows.reduce((s, a) => s + Math.max(0, a.balance), 0);
  const payable = rows.reduce((s, a) => s + Math.max(0, -a.balance), 0);

  return (
    <>
      <PageHeader eyebrow="Operations" title="Travel agents" description="Agents and OTAs who send you bookings — what they owe you and what you owe them.">
        <AgentFormDialog />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Agents" value={rows.filter((a) => a.active).length} hint={`${rows.length} total`} icon={Plane} tone="brand" />
        <StatCard label="Agents owe you" value={money(receivable)} icon={Wallet} tone="emerald" />
        <StatCard label="You owe agents" value={money(payable)} icon={CircleDollarSign} tone="rose" />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No travel agents yet" description="Add agents like MakeMyTrip or local travel offices, then pick them when booking a stay." />
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Agent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="pr-5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id} className={a.active ? "" : "opacity-60"}>
                    <TableCell className="pl-5">
                      <Link href={`/agents/${a.id}`} className="font-medium text-primary hover:underline">
                        {a.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[a.contactPerson, a.phone].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{Number(a.commissionPct)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{a._count.reservations}</TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${a.balance > 0 ? "text-emerald-700" : a.balance < 0 ? "text-rose-600" : ""}`}>
                      {money(Math.abs(a.balance))} {a.balance > 0 ? "due" : a.balance < 0 ? "payable" : ""}
                    </TableCell>
                    <TableCell className="pr-5">
                      <StatusBadge value={a.active ? "ACTIVE" : "INACTIVE"} label={a.active ? "Active" : "Inactive"} tone={a.active ? "success" : "muted"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
