import { notFound } from "next/navigation";
import { CircleDollarSign, Percent, ReceiptText, Wallet } from "lucide-react";
import { AgentFormDialog } from "@/components/agents/agent-form-dialog";
import { AgentBookings, AgentLedger } from "@/components/agents/agent-ledger";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { agentBalance, withRunningBalance } from "@/lib/agents";
import { serialize } from "@/lib/api";
import { requirePageSession } from "@/lib/auth";
import { computeFolio } from "@/lib/folio";
import { formatMoney } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { forHotel } from "@/lib/tenant";

export const metadata = { title: "Agent account" };

export default async function AgentDetailPage({ params }) {
  const session = await requirePageSession("agents");
  const prisma = forHotel(session.hotelId);
  const { id } = await params;
  const agent = await prisma.travelAgent.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      transactions: { orderBy: [{ date: "asc" }, { id: "asc" }] },
      reservations: {
        include: { guest: true, room: true, charges: true, payments: true },
        orderBy: { checkIn: "desc" },
        take: 200,
      },
    },
  });
  if (!agent) notFound();
  const settings = await getSettings(session.hotelId);
  const money = (v) => formatMoney(v, settings.currency);

  const sumOf = (type) => agent.transactions.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0);
  const balance = agentBalance(agent.openingBalance, agent.transactions);
  const billed = new Set(agent.transactions.filter((t) => t.type === "INVOICE" && t.reservationId).map((t) => t.reservationId));
  const bookings = agent.reservations.map((r) => ({ ...r, folio: computeFolio(r, settings.taxRate), billed: billed.has(r.id) }));
  const ledger = withRunningBalance(agent.openingBalance, agent.transactions).reverse();

  return (
    <>
      <PageHeader
        eyebrow="Travel agent"
        title={agent.name}
        description={[agent.contactPerson, agent.phone, agent.email, `${Number(agent.commissionPct)}% commission`].filter(Boolean).join(" · ")}
      >
        <AgentFormDialog agent={serialize(agent)} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={balance >= 0 ? "Agent owes you" : "You owe agent"}
          value={money(Math.abs(balance))}
          icon={CircleDollarSign}
          tone={balance >= 0 ? "emerald" : "rose"}
        />
        <StatCard label="Billed to agent" value={money(sumOf("INVOICE"))} icon={ReceiptText} tone="amber" />
        <StatCard label="Received from agent" value={money(sumOf("PAYMENT"))} icon={Wallet} tone="brand" />
        <StatCard label="Commission given" value={money(sumOf("COMMISSION"))} icon={Percent} tone="violet" />
      </div>

      <div className="mt-6 grid gap-6">
        <AgentLedger agentId={agent.id} ledger={serialize(ledger)} opening={Number(agent.openingBalance)} currency={settings.currency} />
        <AgentBookings agentId={agent.id} bookings={serialize(bookings)} currency={settings.currency} />
      </div>
    </>
  );
}
