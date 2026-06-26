import { getStore } from "@/lib/store";
import WebsitesManager from "@/components/WebsitesManager";

export default async function WebsitesPage() {
  const websites = await getStore().listWebsites();
  return <WebsitesManager initialWebsites={websites} />;
}
