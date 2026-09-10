import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

type AppEnv = { DB?: D1Database; XENDIT_SECRET_KEY?: string; XENDIT_WEBHOOK_TOKEN?: string; ADMIN_EMAILS?: string };
export type AdminRole = "super_admin" | "program_admin" | "finance_admin" | "auditor";
export function appEnv() { return env as unknown as AppEnv; }
export function db() { const binding = appEnv().DB; if (!binding) throw new Error("Database belum tersedia."); return binding; }

export async function ensureDatabase() {
  const binding = db();
  await binding.batch([
    binding.prepare("CREATE TABLE IF NOT EXISTS programs (id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, category TEXT NOT NULL, description TEXT NOT NULL, location TEXT NOT NULL DEFAULT 'Indonesia', target INTEGER NOT NULL, collected INTEGER NOT NULL DEFAULT 0, donors INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', tone TEXT NOT NULL DEFAULT 'mint', icon TEXT NOT NULL DEFAULT '✦', deadline TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    binding.prepare("CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, program_id TEXT NOT NULL, donor_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', anonymous INTEGER NOT NULL DEFAULT 0, amount INTEGER NOT NULL, fee INTEGER NOT NULL DEFAULT 0, method TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', provider TEXT NOT NULL DEFAULT 'manual', provider_id TEXT, payment_action TEXT, expires_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    binding.prepare("CREATE TABLE IF NOT EXISTS disbursements (id TEXT PRIMARY KEY, program_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, amount INTEGER NOT NULL, disbursed_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    binding.prepare("CREATE TABLE IF NOT EXISTS admin_users (email TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'auditor', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    binding.prepare("CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, admin_email TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    binding.prepare("CREATE INDEX IF NOT EXISTS transactions_program_idx ON transactions(program_id)"),
    binding.prepare("CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions(status)"),
    binding.prepare("CREATE INDEX IF NOT EXISTS disbursements_program_idx ON disbursements(program_id)"),
  ]);
  const count = await binding.prepare("SELECT COUNT(*) AS count FROM programs").first<{ count: number }>();
  if (!count?.count) await binding.batch([
    binding.prepare("INSERT INTO programs (id,title,slug,category,description,location,target,collected,donors,status,tone,icon,deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind("program-pangan", "Paket Pangan untuk Keluarga", "paket-pangan-keluarga", "Kemanusiaan", "Hadirkan bahan pangan bergizi untuk keluarga prasejahtera di pelosok Jawa Barat.", "Jawa Barat", 100000000, 68450000, 438, "published", "mint", "♨", "2026-12-31"),
    binding.prepare("INSERT INTO programs (id,title,slug,category,description,location,target,collected,donors,status,tone,icon,deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind("program-beasiswa", "Beasiswa Anak Hebat", "beasiswa-anak-hebat", "Pendidikan", "Bantu anak-anak terus belajar melalui beasiswa sekolah selama satu tahun penuh.", "Indonesia", 75000000, 45900000, 286, "published", "sun", "✦", "2026-11-30"),
    binding.prepare("INSERT INTO programs (id,title,slug,category,description,location,target,collected,donors,status,tone,icon,deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind("program-air", "Air Bersih untuk Desa", "air-bersih-untuk-desa", "Lingkungan", "Bangun sumur dan instalasi air bersih yang layak bagi tiga desa terdampak kekeringan.", "Nusa Tenggara Timur", 150000000, 92750000, 521, "published", "sky", "≈", "2027-01-31"),
    binding.prepare("INSERT INTO disbursements (id,program_id,title,description,amount,disbursed_at) VALUES (?,?,?,?,?,?)").bind("dist-001", "program-pangan", "Distribusi tahap pertama", "Paket pangan disalurkan kepada 120 keluarga.", 18000000, "2026-07-14"),
    binding.prepare("INSERT INTO disbursements (id,program_id,title,description,amount,disbursed_at) VALUES (?,?,?,?,?,?)").bind("dist-002", "program-air", "Pengeboran sumur dimulai", "Pembelian material dan biaya pengeboran sumur pertama.", 32000000, "2026-08-02"),
  ]);
  await binding.prepare("UPDATE transactions SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE status='pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')").run();
}

export function id(prefix: string) { return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; }
export function slugify(value: string) { return value.toLowerCase().trim().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-"); }
export function cleanText(value: unknown, max = 500) { return String(value ?? "").trim().slice(0, max); }

export async function requireAdmin(roles?: AdminRole[]) {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "Silakan masuk untuk mengakses dashboard." }, { status: 401 }) } as const;
  await ensureDatabase(); const binding = db();
  const configured = (appEnv().ADMIN_EMAILS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  let admin = await binding.prepare("SELECT email,name,role FROM admin_users WHERE email = ?").bind(user.email.toLowerCase()).first<{ email: string; name: string; role: AdminRole }>();
  if (!admin && configured.includes(user.email.toLowerCase())) {
    await binding.prepare("INSERT OR IGNORE INTO admin_users (email,name,role) VALUES (?,?,?)").bind(user.email.toLowerCase(), user.displayName, "super_admin").run();
    admin = { email: user.email.toLowerCase(), name: user.displayName, role: "super_admin" };
  }
  if (!admin && configured.length === 0) {
    const count = await binding.prepare("SELECT COUNT(*) AS count FROM admin_users").first<{ count: number }>();
    if (!count?.count) { await binding.prepare("INSERT INTO admin_users (email,name,role) VALUES (?,?,?)").bind(user.email.toLowerCase(), user.displayName, "super_admin").run(); admin = { email: user.email.toLowerCase(), name: user.displayName, role: "super_admin" }; }
  }
  if (!admin) return { error: Response.json({ error: "Akun ini tidak memiliki akses admin." }, { status: 403 }) } as const;
  if (roles && !roles.includes(admin.role)) return { error: Response.json({ error: "Peran Anda tidak memiliki izin untuk tindakan ini." }, { status: 403 }) } as const;
  return { admin } as const;
}

export async function audit(adminEmail: string, action: string, entityType: string, entityId: string, details = "") {
  await db().prepare("INSERT INTO audit_logs (id,admin_email,action,entity_type,entity_id,details) VALUES (?,?,?,?,?,?)").bind(id("AUD"), adminEmail, action, entityType, entityId, details).run();
}
export function errorResponse(error: unknown) { return Response.json({ error: error instanceof Error ? error.message : "Terjadi kesalahan pada server." }, { status: 500 }); }
