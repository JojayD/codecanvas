import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";

export async function GET(request: NextRequest) {
	try {
		const { data, error } = await supabase.auth.getSession();

		if (error) {
			console.error("Error fetching user session:", error);
			return NextResponse.json(
				{ error: "Failed to retrieve user session" },
				{ status: 500 }
			);
		}

		if (data.session) {
			return NextResponse.json({
				user: {
					id: data.session.user.id,
					email: data.session.user.email,
				},
			});
		} else {
			return NextResponse.json({ user: null });
		}
	} catch (error) {
		console.error("Unexpected error in get-user API:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
