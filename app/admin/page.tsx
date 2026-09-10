import { requireChatGPTUser } from "@/app/chatgpt-auth";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireChatGPTUser("/admin");
  return <AdminDashboard/>;
}
