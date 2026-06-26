import { redirect } from "next/navigation";

// Renamed to "Conversations".
export default function ChatHistoryRedirect() {
  redirect("/dashboard/conversations");
}
