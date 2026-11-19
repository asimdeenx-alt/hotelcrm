import { ok, route } from "@/lib/api";

export const GET = route("hotel", async (_req, { session }) => ok(session));
