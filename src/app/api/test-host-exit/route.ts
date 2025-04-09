import { NextRequest, NextResponse } from "next/server";
import { testHostExit } from "@/lib/test-host-exit";

export async function GET(request: NextRequest) {
	try {
		console.log("Running host exit test via API");
		const testResult = await testHostExit();

		return NextResponse.json(
			{
				success: true,
				testPassed: testResult,
				message: testResult
					? "Host exit test passed - room was properly closed"
					: "Host exit test failed - room was not properly closed",
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error in test-host-exit API:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Test execution failed",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
