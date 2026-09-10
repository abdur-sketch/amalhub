import { audit, cleanText, db, ensureDatabase, errorResponse, id, requireAdmin, slugify, type AdminRole } from "@/db/runtime";

const programRoles: AdminRole[] = ["super_admin", "program_admin"];
const financeRoles: AdminRole[] = ["super_admin", "finance_admin"];

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(); if ("error" in auth) return auth.error; const binding = db();
    const [programs, transactions, disbursements, admins, audits, notes, media, settingRows, notifications] = await Promise.all([
      binding.prepare("SELECT id,title,slug,category,description,location,target,collected,donors,status,tone,icon,deadline,created_at AS createdAt,updated_at AS updatedAt FROM programs ORDER BY created_at DESC").all(),
      binding.prepare("SELECT t.id,t.program_id AS programId,p.title AS programTitle,t.donor_name AS donorName,t.email,t.phone,t.message,t.anonymous,t.amount,t.fee,t.method,t.status,t.provider,t.expires_at AS expiresAt,t.created_at AS createdAt FROM transactions t LEFT JOIN programs p ON p.id=t.program_id ORDER BY t.created_at DESC LIMIT 250").all(),
      binding.prepare("SELECT d.id,d.program_id AS programId,p.title AS programTitle,d.title,d.description,d.amount,d.disbursed_at AS disbursedAt,d.created_at AS createdAt FROM disbursements d LEFT JOIN programs p ON p.id=d.program_id ORDER BY d.disbursed_at DESC").all(),
      binding.prepare("SELECT email,name,role,created_at AS createdAt FROM admin_users ORDER BY created_at ASC").all(),
      binding.prepare("SELECT id,admin_email AS adminEmail,action,entity_type AS entityType,entity_id AS entityId,details,created_at AS createdAt FROM audit_logs ORDER BY created_at DESC LIMIT 50").all(),
      binding.prepare("SELECT id,transaction_id AS transactionId,note,created_by AS createdBy,created_at AS createdAt FROM transaction_notes ORDER BY created_at DESC LIMIT 250").all(),
      binding.prepare("SELECT id,entity_type AS entityType,entity_id AS entityId,file_name AS fileName,content_type AS contentType,size,caption,created_by AS createdBy,created_at AS createdAt,'/api/media/'||id AS url FROM media_assets ORDER BY created_at DESC LIMIT 250").all(),
      binding.prepare("SELECT key,value FROM site_settings").all<{key:string;value:string}>(),
      binding.prepare("SELECT id,type,title,message,status,entity_type AS entityType,entity_id AS entityId,created_at AS createdAt FROM notifications ORDER BY created_at DESC LIMIT 100").all(),
    ]);
    const settings = Object.fromEntries(settingRows.results.map((item) => [item.key, item.value]));
    const payload = { admin: auth.admin, programs: programs.results, transactions: transactions.results, disbursements: disbursements.results, admins: admins.results, audits: audits.results, notes: notes.results, media: media.results, settings, notifications: notifications.results };
    if (new URL(request.url).searchParams.get("backup") === "1") { await audit(auth.admin.email, "export", "backup", "database"); return Response.json({ exportedAt:new Date().toISOString(), ...payload }); }
    return Response.json(payload);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase(); const body = await request.json() as Record<string, unknown>; const action = cleanText(body.action, 50);
    if (action === "program") {
      const auth = await requireAdmin(programRoles); if ("error" in auth) return auth.error;
      const title = cleanText(body.title, 120), description = cleanText(body.description, 600), category = cleanText(body.category, 50), location = cleanText(body.location, 100), target = Math.round(Number(body.target));
      if (!title || !description || !category || target < 100000) return Response.json({ error: "Data program belum lengkap." }, { status: 400 });
      const programId = id("PRG"); await db().prepare("INSERT INTO programs (id,title,slug,category,description,location,target,status,tone,icon,deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(programId, title, `${slugify(title)}-${programId.slice(-4).toLowerCase()}`, category, description, location || "Indonesia", target, cleanText(body.status, 20) || "draft", cleanText(body.tone, 20) || "mint", cleanText(body.icon, 5) || "✦", cleanText(body.deadline, 20) || null).run();
      await audit(auth.admin.email, "create", "program", programId, title); return Response.json({ ok: true }, { status: 201 });
    }
    if (action === "disbursement") {
      const auth = await requireAdmin(financeRoles); if ("error" in auth) return auth.error;
      const programId = cleanText(body.programId, 80), title = cleanText(body.title, 120), description = cleanText(body.description, 500), amount = Math.round(Number(body.amount)), date = cleanText(body.disbursedAt, 20);
      if (!programId || !title || !description || amount < 1 || !date) return Response.json({ error: "Data penyaluran belum lengkap." }, { status: 400 });
      const distributionId = id("DST"); await db().prepare("INSERT INTO disbursements (id,program_id,title,description,amount,disbursed_at) VALUES (?,?,?,?,?,?)").bind(distributionId, programId, title, description, amount, date).run();
      await audit(auth.admin.email, "create", "disbursement", distributionId, title); return Response.json({ ok: true }, { status: 201 });
    }
    if (action === "admin") {
      const auth = await requireAdmin(["super_admin"]); if ("error" in auth) return auth.error;
      const email = cleanText(body.email, 160).toLowerCase(), name = cleanText(body.name, 100), role = cleanText(body.role, 30) as AdminRole;
      if (!email.includes("@") || !name || !["super_admin", "program_admin", "finance_admin", "auditor"].includes(role)) return Response.json({ error: "Data pengguna tidak valid." }, { status: 400 });
      await db().prepare("INSERT INTO admin_users (email,name,role) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role").bind(email, name, role).run();
      await audit(auth.admin.email, "upsert", "admin", email, role); return Response.json({ ok: true });
    }
    if (action === "transaction_note") {
      const auth = await requireAdmin(); if ("error" in auth) return auth.error; const transactionId = cleanText(body.transactionId, 50), note = cleanText(body.note, 800);
      if (!transactionId || !note) return Response.json({ error: "Catatan tidak boleh kosong." }, { status:400 });
      const noteId=id("NTE"); await db().prepare("INSERT INTO transaction_notes (id,transaction_id,note,created_by) VALUES (?,?,?,?)").bind(noteId,transactionId,note,auth.admin.email).run(); await audit(auth.admin.email,"note","transaction",transactionId,note.slice(0,120)); return Response.json({ok:true},{status:201});
    }
    if (action === "settings") {
      const auth = await requireAdmin(["super_admin"]); if ("error" in auth) return auth.error;
      const allowed=["organization_name","legal_number","address","email","phone","bank_name","bank_account","instagram"];
      await db().batch(allowed.map((key)=>db().prepare("INSERT INTO site_settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(key,cleanText(body[key],300))));
      await audit(auth.admin.email,"update","settings","site"); return Response.json({ok:true});
    }
    return Response.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    await ensureDatabase(); const body = await request.json() as Record<string, unknown>; const action = cleanText(body.action, 50);
    if (action === "transaction") {
      const auth = await requireAdmin(financeRoles); if ("error" in auth) return auth.error;
      const transactionId = cleanText(body.id, 50), status = cleanText(body.status, 20), fee = Math.max(0, Math.round(Number(body.fee || 0)));
      if (!["verifying", "paid", "failed", "expired", "refunded"].includes(status)) return Response.json({ error: "Status transaksi tidak valid." }, { status: 400 });
      const current = await db().prepare("SELECT id,program_id AS programId,amount,status FROM transactions WHERE id=?").bind(transactionId).first<{ id: string; programId: string; amount: number; status: string }>();
      if (!current) return Response.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
      if (fee > current.amount) return Response.json({error:"Biaya tidak boleh melebihi nominal transaksi."},{status:400});
      await db().prepare("UPDATE transactions SET status=?,fee=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status, fee, transactionId).run();
      if (status === "paid" && current.status !== "paid") await db().prepare("UPDATE programs SET collected=collected+?,donors=donors+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(current.amount, current.programId).run();
      if (current.status === "paid" && status !== "paid") await db().prepare("UPDATE programs SET collected=MAX(0,collected-?),donors=MAX(0,donors-1),updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(current.amount, current.programId).run();
      if (status === "paid" && current.status !== "paid") {
        const progress=await db().prepare("SELECT title,collected,target FROM programs WHERE id=?").bind(current.programId).first<{title:string;collected:number;target:number}>();
        if (progress && progress.collected >= progress.target * .9) await db().prepare("INSERT INTO notifications (id,type,title,message,entity_type,entity_id) VALUES (?,?,?,?,?,?)").bind(id("NTF"),"target","Target program hampir tercapai",`${progress.title} telah mencapai ${Math.round(progress.collected/progress.target*100)}% dari target.`,"program",current.programId).run();
      }
      await audit(auth.admin.email, "status", "transaction", transactionId, `${current.status} -> ${status}`); return Response.json({ ok: true });
    }
    if (action === "program") {
      const auth = await requireAdmin(programRoles); if ("error" in auth) return auth.error;
      const programId = cleanText(body.id, 80), title = cleanText(body.title, 120), description = cleanText(body.description, 600), category = cleanText(body.category, 50), location = cleanText(body.location, 100), target = Math.round(Number(body.target)), status = cleanText(body.status, 20);
      if (!programId || !title || !description || target < 100000 || !["draft", "published", "paused", "completed", "archived"].includes(status)) return Response.json({ error: "Data program tidak valid." }, { status: 400 });
      await db().prepare("UPDATE programs SET title=?,category=?,description=?,location=?,target=?,status=?,deadline=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(title, category, description, location || "Indonesia", target, status, cleanText(body.deadline, 20) || null, programId).run();
      await audit(auth.admin.email, "update", "program", programId, title); return Response.json({ ok: true });
    }
    if (action === "admin") {
      const auth = await requireAdmin(["super_admin"]); if ("error" in auth) return auth.error; const email=cleanText(body.email,160).toLowerCase(),name=cleanText(body.name,100),role=cleanText(body.role,30) as AdminRole;
      if (!email.includes("@")||!name||!["super_admin","program_admin","finance_admin","auditor"].includes(role)) return Response.json({error:"Data pengguna tidak valid."},{status:400});
      await db().prepare("UPDATE admin_users SET name=?,role=? WHERE email=?").bind(name,role,email).run(); await audit(auth.admin.email,"update","admin",email,role); return Response.json({ok:true});
    }
    if (action === "notification") {
      const auth=await requireAdmin(); if("error" in auth)return auth.error; const notificationId=cleanText(body.id,80);
      await db().prepare("UPDATE notifications SET status='read' WHERE id=?").bind(notificationId).run(); return Response.json({ok:true});
    }
    return Response.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin(["super_admin"]); if ("error" in auth) return auth.error; const url = new URL(request.url), type = url.searchParams.get("type"), entityId = cleanText(url.searchParams.get("id"), 100);
    if (type === "program") {
      const count = await db().prepare("SELECT COUNT(*) AS count FROM transactions WHERE program_id=?").bind(entityId).first<{ count: number }>();
      if (count?.count) { await db().prepare("UPDATE programs SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(entityId).run(); await audit(auth.admin.email, "archive", "program", entityId); }
      else { await db().prepare("DELETE FROM programs WHERE id=?").bind(entityId).run(); await audit(auth.admin.email, "delete", "program", entityId); }
      return Response.json({ ok: true, archived: Boolean(count?.count) });
    }
    if (type === "admin") {
      if (entityId === auth.admin.email) return Response.json({ error: "Anda tidak dapat menghapus akun sendiri." }, { status: 400 });
      await db().prepare("DELETE FROM admin_users WHERE email=?").bind(entityId).run(); await audit(auth.admin.email, "delete", "admin", entityId); return Response.json({ ok: true });
    }
    return Response.json({ error: "Data tidak dikenali." }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}
