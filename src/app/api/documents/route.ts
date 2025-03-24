// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { saveCodeDocument, getCodeDocument } from "@/lib/dynamodb";
import {createServerClient} from "@supabase/ssr";
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First create a client with cookies handling (required by API)
    const cookieStore = req.cookies;
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value
            },
            set(name, value, options) {
              // Not needed for this context but required by the interface
            },
            remove(name, options) {
              // Not needed for this context but required by the interface
            },
          }
        }
    );

    // Then use the token to get the user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Auth error:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { documentId, content, language } = await req.json();
    await saveCodeDocument(documentId, content, language, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving document:", error);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}
export async function GET(req: NextRequest) {
  try {
    const documentId = req.nextUrl.searchParams.get("id");
    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    const response = await getCodeDocument(documentId);

    if (!response.Item) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(response.Item);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}