import { db, ensureDatabase, errorResponse } from "@/db/runtime";

export async function GET() {
  try {
    await ensureDatabase();
    const binding = db();
    const [programs, updates] = await Promise.all([
      binding.prepare("SELECT id,title,slug,category,description,location,target,collected,donors,status,tone,icon,deadline,created_at AS createdAt,updated_at AS updatedAt FROM programs WHERE status IN ('published','completed') ORDER BY created_at DESC").all(),
      binding.prepare("SELECT d.id,d.program_id AS programId,p.title AS programTitle,d.title,d.description,d.amount,d.disbursed_at AS disbursedAt FROM disbursements d JOIN programs p ON p.id=d.program_id ORDER BY d.disbursed_at DESC LIMIT 8").all(),
    ]);
    return Response.json({ programs: programs.results, updates: updates.results }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (error) { return errorResponse(error); }
}
