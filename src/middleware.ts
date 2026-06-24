import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - static assets (_next/static, _next/image, favicon)
     * - the public widget script and API (handled with their own CORS/auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|widget.js|api/widget|api/chat).*)",
  ],
};
