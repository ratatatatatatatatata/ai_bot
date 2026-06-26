import { isDemo } from "@/lib/config";
import { demoStore } from "@/lib/store/demo";
import { supabaseStore } from "@/lib/store/supabase";

export type Store = typeof demoStore;

/**
 * Returns the active data store. Demo mode uses a local file-backed JSON store;
 * otherwise the Supabase-backed store is used. Both expose the same interface.
 */
export function getStore(): Store {
  return isDemo() ? demoStore : (supabaseStore as unknown as Store);
}
