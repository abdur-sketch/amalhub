import { appEnv, audit, cleanText, db, ensureDatabase, errorResponse, id, requireAdmin } from "@/db/runtime";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(["super_admin", "program_admin", "finance_admin"]); if ("error" in auth) return auth.error;
    await ensureDatabase(); const bucket = appEnv().MEDIA; if (!bucket) throw new Error("Penyimpanan media belum tersedia.");
    const form = await request.formData(), file = form.get("file"), entityType = cleanText(form.get("entityType"), 30), entityId = cleanText(form.get("entityId"), 100), caption = cleanText(form.get("caption"), 200);
    if (!(file instanceof File) || !allowedTypes.has(file.type)) return Response.json({ error: "Gunakan gambar JPG, PNG, WebP, atau dokumen PDF." }, { status: 400 });
    if (file.size > 900 * 1024) return Response.json({ error: "Ukuran berkas maksimal 900 KB." }, { status: 400 });
    if (!["program", "disbursement"].includes(entityType) || !entityId) return Response.json({ error: "Tujuan media tidak valid." }, { status: 400 });
    if ((entityType === "program" && auth.admin.role === "finance_admin") || (entityType === "disbursement" && auth.admin.role === "program_admin")) return Response.json({ error: "Peran Anda tidak memiliki izin untuk media ini." }, { status: 403 });
    const mediaId = id("MED"), extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin", objectKey = `${entityType}/${entityId}/${mediaId}.${extension}`;
    await bucket.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { originalName: file.name, uploadedBy: auth.admin.email } });
    await db().prepare("INSERT INTO media_assets (id,entity_type,entity_id,object_key,file_name,content_type,size,caption,created_by) VALUES (?,?,?,?,?,?,?,?,?)").bind(mediaId, entityType, entityId, objectKey, file.name.slice(0, 180), file.type, file.size, caption, auth.admin.email).run();
    await audit(auth.admin.email, "upload", "media", mediaId, `${entityType}:${entityId}`); return Response.json({ media: { id: mediaId, url: `/api/media/${mediaId}` } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
