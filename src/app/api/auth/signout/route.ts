import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
	try {
		// Initialize Supabase client with cookie handling
		const cookieStore = cookies();
		const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

		// Sign out from Supabase which clears the session
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Error signing out from Supabase:", error.message);
			return NextResponse.json(
				{ success: false, error: error.message },
				{ status: 500 }
			);
		}

		// Clear all auth-related cookies
		const authCookies = [
			"sb-access-token",
			"sb-refresh-token",
			"supabase-auth-token",
		];
		const response = NextResponse.json({ success: true });

		// Explicitly expire all auth cookies
		authCookies.forEach((name) => {
			response.cookies.set({
				name,
				value: "",
				expires: new Date(0),
				path: "/",
			});
		});

		return response;
	} catch (error) {
		console.error("Unexpected error during sign out:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
