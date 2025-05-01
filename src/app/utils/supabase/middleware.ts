import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { type CookieOptions } from "@supabase/ssr";

const protectedRoutes = ["/dashboard", "/recordings"];
const unauthenticatedRoutes = [
	"/login",
	"/policy",
	"/termsofservice",
	"/about",
];
// Auth-related routes that should bypass protection checks
const bypassRoutes = ["/api/auth/callback", "/auth/check-email"];
export const updateSession = async (request: NextRequest) => {
	// This `try/catch` block is only here for the interactive tutorial.
	// Feel free to remove once you have Supabase connected.
	try {
		// Create an unmodified response
		let response = NextResponse.next({
			request: {
				headers: request.headers,
			},
		});

		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					getAll() {
						return request.cookies.getAll();
					},
					setAll(
						cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
					) {
						cookiesToSet.forEach(({ name, value }) =>
							request.cookies.set(name, value)
						);
						response = NextResponse.next({
							request,
						});
						cookiesToSet.forEach(({ name, value, options }) =>
							response.cookies.set(name, value, options)
						);
					},
				},
			}
		);

		// This will refresh session if expired - required for Server Components
		// https://supabase.com/docs/guides/auth/server-side/nextjs
		const user = await supabase.auth.getUser();
		// protected routes			
		if (bypassRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
  	return response;
		}		

		if (protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route)) && user.error) {
			return NextResponse.redirect(new URL("/login", request.url));
		}

		// only unauthenticated users should be able to view these routes
		if (
			unauthenticatedRoutes.some((route) =>
				request.nextUrl.pathname.startsWith(route)
			) &&
			!user.error
		) {
			return NextResponse.redirect(new URL("/", request.url));
		}
		if (request.nextUrl.pathname === "/" && !user.error) {
			return NextResponse.redirect(new URL("/dashboard", request.url));
		}

		return response;
	} catch (e) {
		// If you are here, a Supabase client could not be created!
		// This is likely because you have not set up environment variables.
		// Check out http://localhost:3000 for Next Steps.
		return NextResponse.next({
			request: {
				headers: request.headers,
			},
		});
	}
};
