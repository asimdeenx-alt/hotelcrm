import { round2 } from "./format";

/** How each transaction type moves what the agent owes the hotel. */
export const AGENT_TXN_SIGN = { INVOICE: 1, ADJUSTMENT: 1, PAYMENT: -1, COMMISSION: -1 };

/**
 * Agent balance = opening + invoices + adjustments − payments − commission.
 * Positive = agent owes the hotel; negative = hotel owes the agent.
 */
export function agentBalance(openingBalance, transactions = []) {
  return round2(
    transactions.reduce((sum, t) => sum + AGENT_TXN_SIGN[t.type] * Number(t.amount), Number(openingBalance ?? 0))
  );
}

/** Adds a running balance to transactions sorted oldest first. */
export function withRunningBalance(openingBalance, transactions) {
  let running = Number(openingBalance ?? 0);
  return transactions.map((t) => {
    running = round2(running + AGENT_TXN_SIGN[t.type] * Number(t.amount));
    return { ...t, balance: running };
  });
}
