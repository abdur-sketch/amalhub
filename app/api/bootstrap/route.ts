import { db, ensureDatabase, errorResponse } from "@/db/runtime";

export async function GET() {
  try {
    await ensureDatabase();
    const binding = db();
    const [programs, updates, settingRows] = await Promise.all([
      binding.prepare("SELECT p.id,p.title,p.slug,p.category,p.description,p.location,p.target,p.collected,p.donors,p.status,p.tone,p.icon,p.deadline,p.created_at AS createdAt,p.updated_at AS updatedAt,(SELECT '/api/media/'||m.id FROM media_assets m WHERE m.entity_type='program' AND m.entity_id=p.id AND m.content_type LIKE 'image/%' ORDER BY m.created_at DESC LIMIT 1) AS imageUrl FROM programs p WHERE p.status IN ('published','completed') ORDER BY p.created_at DESC").all(),
      binding.prepare("SELECT d.id,d.program_id AS programId,p.title AS programTitle,d.title,d.description,d.amount,d.disbursed_at AS disbursedAt,(SELECT '/api/media/'||m.id FROM media_assets m WHERE m.entity_type='disbursement' AND m.entity_id=d.id AND m.content_type LIKE 'image/%' ORDER BY m.created_at DESC LIMIT 1) AS imageUrl FROM disbursements d JOIN programs p ON p.id=d.program_id ORDER BY d.disbursed_at DESC LIMIT 8").all(),
      binding.prepare("SELECT key,value FROM site_settings").all<{key:string;value:string}>(),
    ]);
    const settings = Object.fromEntries(settingRows.results.map((item) => [item.key, item.value]));
    return Response.json({ programs: programs.results, updates: updates.results, settings }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (error) { return errorResponse(error); }
}
