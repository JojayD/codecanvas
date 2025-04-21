// src/app/api/auth/confirm/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function POST(req: NextRequest) {
  const { token_hash } = await req.json(); // Get the token_hash from the request body

  // Use the cookie store promise directly (do not await) to satisfy the helper's expectations
  const cookieStorePromise = cookies();

  // Initialize the Supabase client for route handlers with cookie promise
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStorePromise,
  });

  // Exchange the token hash for a session
  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: 'email',
  });

  if (error) {
    console.error("OTP verification error:", error);
    // Redirect back to login with error
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', error.message);
    return NextResponse.redirect(loginUrl);
  }

  // On success, redirect to the dashboard or another page
  return NextResponse.redirect(new URL('/dashboard', req.url));
}