import {createClient} from "../../../utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Make route dynamic to ensure fresh cookies
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Add verbose debugging to trace auth callback issues
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();
  
  console.log('=== AUTH CALLBACK DEBUGGING ===');
  console.log(`Origin: ${origin}`);
  console.log(`Redirect destination: ${redirectTo || '/dashboard'}`);
  console.log(`Has code: ${code ? 'Yes' : 'No'}`);
  console.log(`NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL || '(not set)'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

  try {
    if (code) {
      // Try the route handler client first - this works better with Next.js App Router
      try {
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Error with route handler client:', error);
          // Fall back to server client if this fails
          const fallbackClient = await createClient();
          await fallbackClient.auth.exchangeCodeForSession(code);
        } else {
          console.log('Successfully exchanged code for session using route handler client');
        }
      } catch (error) {
        console.error('Exception with route handler client:', error);
        // Fall back to server client
        console.log('Falling back to server client');
        const fallbackClient = await createClient();
        await fallbackClient.auth.exchangeCodeForSession(code);
      }
    }

    // Determine where to redirect after authentication
    let finalRedirectUrl = '';
    
    if (redirectTo) {
      finalRedirectUrl = `${origin}${redirectTo}`;
    } else {
      // Use production URL if set, otherwise use request origin
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
      finalRedirectUrl = `${siteUrl}/dashboard`;
      
      // If origin includes localhost, but SITE_URL is set, use SITE_URL
      if (origin.includes('localhost') && process.env.NEXT_PUBLIC_SITE_URL) {
        finalRedirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`;
        console.log(`⚠️ Detected localhost but NEXT_PUBLIC_SITE_URL is set, redirecting to: ${finalRedirectUrl}`);
      }
    }
    
    console.log(`Final redirect URL: ${finalRedirectUrl}`);
    return NextResponse.redirect(finalRedirectUrl);
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${origin}/login?error=Authentication+failed`);
  }
}