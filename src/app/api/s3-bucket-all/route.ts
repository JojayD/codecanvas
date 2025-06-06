export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { verifyS3Access, debugAwsCredentials } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { log } from "console";
import { S3Client } from "@aws-sdk/client-s3";


// Add OPTIONS handler for preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://codecanvas.digital',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-amz-content-sha256, x-amz-date, Authorization, x-amz-security-token',
      'Access-Control-Max-Age': '3000'
    }
  });
}

async function listUserFiles(userId: string) {
  // Run diagnostics first
  await debugAwsCredentials();
  
  // Debug credentials to verify they're properly resolved
  // try {
  //   const creds = await s3Client.config.credentials!();
  //   console.log("Resolved S3 credentials:", {
  //     accessKeyId: creds.accessKeyId ? creds.accessKeyId.substring(0, 4) + "..." : undefined,
  //     secretAccessKey: creds.secretAccessKey ? "***" : undefined,
  //     sessionToken: creds.sessionToken ? "Present" : "None",
  //   });
  // } catch (error) {
  //   console.error("Failed to resolve credentials:", error);
  // }
  const s3 = new S3Client({
    region: process.env.MYAPP_AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.MYAPP_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.MYAPP_AWS_SECRET_ACCESS_KEY!,
    }
  });
  console.log("S3 client created");
  const bucketName = process.env.S3_BUCKET_NAME || "code-canvas-recordings";
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: `${userId}/`,
    MaxKeys: 100
  });

  const response = await s3.send(command);
  const files = response.Contents?.map((item) => ({
    key: item.Key,
    lastModified: item.LastModified,
    size: item.Size,
    name: item.Key?.split('/').pop()
  })) || [];

  return files;
}

export async function GET(request: NextRequest) {
  // Log env vars (safely)
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
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    log("User ID from s3-bucket-all:", userId);
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
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
    const res = await listUserFiles(userId);
    return NextResponse.json(
      { success: true, files: res },
      {
        headers: {
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3000' 
            : 'https://codecanvas.digital',
          'Access-Control-Expose-Headers': 'ETag'
        }
      }
    );
  } catch (error: any) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list files" },
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