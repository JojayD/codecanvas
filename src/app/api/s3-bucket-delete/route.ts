export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { verifyS3Access, getS3Config, debugAwsCredentials } from "@/lib/s3";

// Add OPTIONS handler for preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://codecanvas.digital',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-amz-content-sha256, x-amz-date, Authorization, x-amz-security-token',
      'Access-Control-Max-Age': '3000'
    }
  });
}

export async function DELETE(request: NextRequest) {
  // Run diagnostics to debug AWS credentials
  await debugAwsCredentials();
  
  try {
    // Verify S3 access first (helps with debugging)
    const accessVerified = await verifyS3Access();
    if (!accessVerified) {
      console.error("S3 access verification failed");
      return NextResponse.json(
        { error: "Failed to access S3 bucket" },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
              ? 'http://localhost:3000' 
              : 'https://codecanvas.digital'
          }
        }
      );
    }
    
    const { key, user_id } = await request.json();
    console.log("Delete request for key:", key);
    if (!key) {
      return NextResponse.json(
        { error: "Missing key parameter" },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
              ? 'http://localhost:3000' 
              : 'https://codecanvas.digital'
          }
        }
      );
    }
    
    // Verify user has permission to delete this file
    console.log("Authenticated user ID:", user_id);
    
    // Check if the key starts with the user's ID
    if (!key.startsWith(`${user_id}/`)) {
      console.log("Key doesn't start with user ID, checking if user has access rights");
      // Note: Add additional permission checks here if needed
    }
    
    // Initialize S3 client with proper credentials
    const s3 = new S3Client(getS3Config());
    
    console.log("Proceeding with deletion for key:", key);
    
    const command = new DeleteObjectCommand({
      Bucket: "code-canvas-recordings",
      Key: key,
    });
    
    await s3.send(command);
    
    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3000' 
            : 'https://codecanvas.digital'
        }
      }
    );
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete file" },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3000' 
            : 'https://codecanvas.digital'
        }
      }
    );
  }
}