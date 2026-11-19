// Subscription rules shared by server and client code.

export const TRIAL_DAYS = 14;

/**
 * @param {{ status: string, subscriptionEndsAt?: string | Date | null } | null} hotel
 * @returns {{ allowed: boolean, reason: string | null, daysLeft: number | null }}
 */
export function hotelAccess(hotel) {
  if (!hotel) return { allowed: false, reason: "This account is not linked to a hotel.", daysLeft: null };
  const ends = hotel.subscriptionEndsAt ? new Date(hotel.subscriptionEndsAt) : null;
  const daysLeft = ends ? Math.ceil((ends.getTime() - Date.now()) / 86400000) : null;

  if (hotel.status === "SUSPENDED") {
    return { allowed: false, reason: "This hotel account has been suspended. Please contact support.", daysLeft };
  }
  if (ends && ends.getTime() <= Date.now()) {
    return {
      allowed: false,
      reason:
        hotel.status === "TRIAL"
          ? "Your free trial has ended. Contact support to activate a subscription."
          : "Your subscription has expired. Contact support to renew it.",
      daysLeft: 0,
    };
  }
  return { allowed: true, reason: null, daysLeft };
}
