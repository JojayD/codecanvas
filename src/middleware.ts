import { updateSession } from "@/app/utils/supabase/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Log information about all requests for debugging
  const pathname = request.nextUrl.pathname;
  
  // Debug auth-related routes
  if (pathname.includes('/api/auth/') || pathname.includes('/auth/')) {
    console.log(`[Middleware] Processing auth route: ${pathname}`);
    console.log(`[Middleware] Request origin: ${request.nextUrl.origin}`);
    console.log(`[Middleware] NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL || '(not set)'}`);
  }
  
  // Let auth callback requests pass through directly without any middleware processing
  if (pathname.startsWith('/api/auth/callback')) {
    console.log(`[Middleware] Bypassing auth callback: ${pathname}`);
    return NextResponse.next();
  }
  
  // Update the session for all other routes
  return updateSession(request);
}

// Apply middleware to all routes except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};