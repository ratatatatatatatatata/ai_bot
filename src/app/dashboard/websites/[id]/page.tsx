import { notFound } from "next/navigation";
import Link from "next/link";
import { getStore } from "@/lib/store";
import TrainingPanel from "@/components/TrainingPanel";

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStore();
  const website = await store.getWebsite(id);
  if (!website) notFound();

  const [pages, qa, docs] = await Promise.all([
    store.listPages(id),
    store.listQA(id),
    store.listDocs(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/websites" className="text-sm text-slate-500 hover:text-slate-700">
          ← All knowledge bases
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {website.name || website.base_url}
        </h1>
        <a href={website.base_url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
          {website.base_url}
        </a>
      </div>

      <TrainingPanel
        websiteId={id}
        baseUrl={website.base_url}
        initialPages={pages}
        initialQA={qa}
        initialDocs={docs}
      />
    </div>
  );
}
