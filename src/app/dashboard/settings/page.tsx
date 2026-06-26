import { redirect } from "next/navigation";

// Customization moved to each chatbot's settings page.
export default function SettingsRedirect() {
  redirect("/dashboard/chatbots");
}
