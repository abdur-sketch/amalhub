import { appEnv, audit, cleanText, db, ensureDatabase, errorResponse, requireAdmin } from "@/db/runtime";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabase(); const { id } = await context.params; const media = await db().prepare("SELECT object_key AS objectKey,content_type AS contentType,file_name AS fileName FROM media_assets WHERE id=?").bind(cleanText(id, 80)).first<{objectKey:string;contentType:string;fileName:string}>();
    if (!media) return new Response("Not found", { status: 404 }); const object = await appEnv().MEDIA?.get(media.objectKey); if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, { headers: { "Content-Type": media.contentType, "Content-Length": String(object.size), "Cache-Control": "public, max-age=86400", "Content-Disposition": media.contentType === "application/pdf" ? `inline; filename="${media.fileName.replaceAll('"', '')}"` : "inline" } });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(["super_admin", "program_admin", "finance_admin"]); if ("error" in auth) return auth.error; const { id } = await context.params; const mediaId = cleanText(id, 80);
    const media = await db().prepare("SELECT object_key AS objectKey,entity_type AS entityType FROM media_assets WHERE id=?").bind(mediaId).first<{objectKey:string;entityType:string}>(); if (!media) return Response.json({ error: "Media tidak ditemukan." }, { status: 404 });
    if ((media.entityType === "program" && auth.admin.role === "finance_admin") || (media.entityType === "disbursement" && auth.admin.role === "program_admin")) return Response.json({ error: "Peran Anda tidak memiliki izin untuk media ini." }, { status: 403 });
    await appEnv().MEDIA?.delete(media.objectKey); await db().prepare("DELETE FROM media_assets WHERE id=?").bind(mediaId).run(); await audit(auth.admin.email, "delete", "media", mediaId); return Response.json({ ok:true });
  } catch (error) { return errorResponse(error); }
}
