import { cleanText, db, ensureDatabase, errorResponse } from "@/db/runtime";

export async function GET(request: Request) {
  try {
    await ensureDatabase(); const url = new URL(request.url); const id = cleanText(url.searchParams.get("id"), 40); const contact = cleanText(url.searchParams.get("contact"), 160).toLowerCase();
    if (!id || !contact) return Response.json({ error: "Masukkan ID transaksi dan email/nomor WhatsApp." }, { status: 400 });
    const row = await db().prepare("SELECT t.id,t.amount,t.method,t.status,t.expires_at AS expiresAt,t.created_at AS createdAt,p.title AS programTitle FROM transactions t JOIN programs p ON p.id=t.program_id WHERE t.id=? AND (LOWER(t.email)=? OR t.phone=?)").bind(id.toUpperCase(), contact, contact).first();
    if (!row) return Response.json({ error: "Transaksi tidak ditemukan. Periksa kembali data Anda." }, { status: 404 });
    return Response.json({ transaction: row });
  } catch (error) { return errorResponse(error); }
}
