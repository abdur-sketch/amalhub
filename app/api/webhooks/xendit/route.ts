import { appEnv, db, ensureDatabase, errorResponse } from "@/db/runtime";

export async function POST(request: Request) {
  try {
    const token = appEnv().XENDIT_WEBHOOK_TOKEN;
    if (!token || request.headers.get("x-callback-token") !== token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    await ensureDatabase(); const body = await request.json() as Record<string, unknown>;
    const data = (body.data && typeof body.data === "object" ? body.data : body) as Record<string, unknown>;
    const referenceId = String(data.reference_id || (data.metadata as Record<string, unknown> | undefined)?.transaction_id || "");
    const providerStatus = String(data.status || body.event || "").toUpperCase();
    const nextStatus = providerStatus.includes("SUCCEEDED") || providerStatus.includes("COMPLETED") ? "paid" : providerStatus.includes("EXPIRED") ? "expired" : providerStatus.includes("FAILED") ? "failed" : "verifying";
    const current = await db().prepare("SELECT id,program_id AS programId,amount,status FROM transactions WHERE id=?").bind(referenceId).first<{ id: string; programId: string; amount: number; status: string }>();
    if (!current) return Response.json({ received: true });
    await db().prepare("UPDATE transactions SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(nextStatus, referenceId).run();
    if (nextStatus === "paid" && current.status !== "paid") await db().prepare("UPDATE programs SET collected=collected+?,donors=donors+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(current.amount, current.programId).run();
    return Response.json({ received: true });
  } catch (error) { return errorResponse(error); }
}
