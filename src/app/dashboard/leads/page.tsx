import { getStore } from "@/lib/store";
import LeadsView from "@/components/LeadsView";

export default async function LeadsPage() {
  const store = getStore();
  const [leads, websites] = await Promise.all([
    store.listLeads({}),
    store.listWebsites(),
  ]);
  return <LeadsView initialLeads={leads} websites={websites} />;
}
