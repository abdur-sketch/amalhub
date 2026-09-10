import { appEnv, cleanText, db, ensureDatabase, errorResponse, id } from "@/db/runtime";

type PaymentAction = { type?: string; descriptor?: string; value?: string };

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await request.json() as Record<string, unknown>;
    const programId = cleanText(body.programId, 80), donorName = cleanText(body.name, 100), email = cleanText(body.email, 160).toLowerCase();
    const phone = cleanText(body.phone, 30), message = cleanText(body.message, 300), method = cleanText(body.method, 40);
    const amount = Math.round(Number(body.amount)), anonymous = Boolean(body.anonymous);
    if (cleanText(body.website, 100)) return Response.json({ error: "Permintaan tidak dapat diproses." }, { status: 400 });
    if (!programId || !donorName || !email.includes("@") || phone.length < 8) return Response.json({ error: "Lengkapi nama, email, dan nomor WhatsApp yang valid." }, { status: 400 });
    if (!Number.isFinite(amount) || amount < 10000 || amount > 100000000) return Response.json({ error: "Nominal donasi harus antara Rp10.000 dan Rp100.000.000." }, { status: 400 });
    if (!["QRIS", "Transfer Bank", "E-Wallet"].includes(method)) return Response.json({ error: "Metode pembayaran tidak tersedia." }, { status: 400 });
    const program = await db().prepare("SELECT id,title,status FROM programs WHERE id=?").bind(programId).first<{ id: string; title: string; status: string }>();
    if (!program || program.status !== "published") return Response.json({ error: "Program sedang tidak menerima donasi." }, { status: 404 });
    const recent = await db().prepare("SELECT COUNT(*) AS count FROM transactions WHERE (email=? OR phone=?) AND created_at >= datetime('now','-1 hour')").bind(email, phone).first<{ count:number }>();
    if ((recent?.count || 0) >= 5) return Response.json({ error: "Terlalu banyak percobaan. Silakan coba kembali dalam satu jam." }, { status: 429 });

    const transactionId = id("DN"), expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    let provider = "manual", providerId: string | null = null;
    let paymentAction = JSON.stringify({ descriptor: method === "QRIS" ? "QR_STRING" : method === "Transfer Bank" ? "VIRTUAL_ACCOUNT_NUMBER" : "WEB_URL", value: method === "Transfer Bank" ? "71308810245" : method === "E-Wallet" ? "https://example.com/demo-wallet" : "AMALHUB-DEMO-QRIS" });
    const secret = appEnv().XENDIT_SECRET_KEY;
    if (secret) {
      const origin = new URL(request.url).origin;
      const channel = method === "QRIS" ? "QRIS" : method === "Transfer Bank" ? "BCA_VIRTUAL_ACCOUNT" : "DANA";
      const payload: Record<string, unknown> = { reference_id: transactionId, type: "PAY", country: "ID", currency: "IDR", request_amount: amount, channel_code: channel, description: `Donasi ${program.title}`, metadata: { transaction_id: transactionId, program_id: programId } };
      if (channel !== "QRIS") payload.channel_properties = channel === "BCA_VIRTUAL_ACCOUNT" ? { expires_at: expiresAt, display_name: donorName.slice(0, 20), success_return_url: `${origin}/?payment=${transactionId}` } : { success_return_url: `${origin}/?payment=${transactionId}`, failure_return_url: `${origin}/?payment=${transactionId}` };
      const paymentResponse = await fetch("https://api.xendit.co/v3/payment_requests", { method: "POST", headers: { Authorization: `Basic ${btoa(`${secret}:`)}`, "Content-Type": "application/json", "api-version": "2024-11-11", "Idempotency-key": transactionId }, body: JSON.stringify(payload) });
      if (!paymentResponse.ok) throw new Error("Penyedia pembayaran belum dapat memproses transaksi. Silakan coba lagi.");
      const payment = await paymentResponse.json() as { payment_request_id?: string; actions?: PaymentAction[] };
      provider = "xendit"; providerId = payment.payment_request_id || null; paymentAction = JSON.stringify(payment.actions?.[0] || null);
    }
    await db().prepare("INSERT INTO transactions (id,program_id,donor_name,email,phone,message,anonymous,amount,method,status,provider,provider_id,payment_action,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(transactionId, programId, donorName, email, phone, message, anonymous ? 1 : 0, amount, method, "pending", provider, providerId, paymentAction, expiresAt).run();
    return Response.json({ transaction: { id: transactionId, programId, programTitle: program.title, donorName, email, phone, message, anonymous, amount, method, status: "pending", provider, paymentAction: JSON.parse(paymentAction), expiresAt, createdAt: new Date().toISOString() } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
