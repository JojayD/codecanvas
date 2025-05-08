export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadBucketCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { supabase } from "@/lib/supabase";
import { log } from "console";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Config, debugAwsCredentials } from "@/lib/s3";

// Add OPTIONS handler for preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://codecanvas.digital',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-amz-content-sha256, x-amz-date, Authorization, x-amz-security-token',
      'Access-Control-Max-Age': '3000'
    }
  });
}

const presignDownload = async (key: string) => {
  const s3 = new S3Client(getS3Config());
  
  // Debug credentials
  try {
    const creds = await s3.config.credentials!();
    console.log("Download - Resolved S3 credentials:", {
      accessKeyId: creds.accessKeyId ? creds.accessKeyId.substring(0, 4) + "..." : undefined,
      secretAccessKey: creds.secretAccessKey ? "***" : undefined,
      sessionToken: creds.sessionToken ? "Present" : "None",
    });
  } catch (error) {
    console.error("Failed to resolve credentials for download:", error);
  }
  const BUCKET = process.env.S3_BUCKET_NAME!;
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 3600,
  });
  log("Presigned URL:", signedUrl);
  return signedUrl;
}

const presignUpload = async (key: string, contentType = 'video/webm') => {
  const s3 = new S3Client(getS3Config());
  
  // Debug credentials
  try {
    const creds = await s3.config.credentials!();
    console.log("Upload - Resolved S3 credentials:", {
      accessKeyId: creds.accessKeyId ? creds.accessKeyId.substring(0, 4) + "..." : undefined,
      secretAccessKey: creds.secretAccessKey ? "***" : undefined,
      sessionToken: creds.sessionToken ? "Present" : "None",
    });
  } catch (error) {
    console.error("Failed to resolve credentials for upload:", error);
  }
  const BUCKET = process.env.S3_BUCKET_NAME!;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 3600,
  });

  return signedUrl;
}

async function verifyS3Access() {
  try {
    // Run diagnostic check first
    await debugAwsCredentials();
    
    // Initialize the S3 client with appropriate credentials
    const s3 = new S3Client(getS3Config());
    
    // Debug credentials to verify they're properly resolved
    try {
      const creds = await s3.config.credentials!();
      console.log("Verify - Resolved S3 credentials:", {
        accessKeyId: creds.accessKeyId ? creds.accessKeyId.substring(0, 4) + "..." : undefined,
        secretAccessKey: creds.secretAccessKey ? "***" : undefined,
        sessionToken: creds.sessionToken ? "Present" : "None",
      });
    } catch (error) {
      console.error("Failed to resolve credentials for verification:", error);
      return false;
    }
    
    // Check if bucket exists
    const bucketName = "code-canvas-recordings";
    console.log(`Verifying bucket '${bucketName}' exists and is accessible...`);
    
    const headBucketCommand = new HeadBucketCommand({ Bucket: bucketName });
    
    try {
      await s3.send(headBucketCommand);
      console.log(`SUCCESS: Bucket '${bucketName}' exists and is accessible.`);
      return true;
    } catch (bucketError: any) {
      console.error(`ERROR: Cannot access bucket '${bucketName}':`);
      console.error(`   Status: ${bucketError.name} (${bucketError.$metadata?.httpStatusCode})`);
      console.error(`   Message: ${bucketError.message}`);
      return false;
    }
  } catch (e: any) {
    console.error(" ERROR: Failed to initialize S3 client:", e.message);
    return false;
  }
}

// Verify S3 access when the module is loaded

export async function POST(request: NextRequest) {
  console.log("Presigned URL request received");
  
  try {
    // Verify S3 access first - this helps debug permission issues
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
    
    const { fileName, userId } = await request.json();
  
    if (!fileName) {
      return NextResponse.json(
        { error: "Missing fileName" },
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
    
    console.log("Generating presigned URL for:", { fileName, userId });
    
    // Create S3 path with user ID as folder
    const objectKey = `${userId || 'anonymous'}/${fileName}`;
    
    // Generate presigned URL specifically for video/webm content
    const presignedUrl = await presignUpload(objectKey);
    
    console.log("Presigned URL generated successfully");
    
    // Enable CORS for the browser upload
    return NextResponse.json(
      { url: presignedUrl },
      {
        headers: {
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3000' 
            : 'https://codecanvas.digital',
          'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-amz-content-sha256, x-amz-date, Authorization, x-amz-security-token',
          'Access-Control-Expose-Headers': 'ETag'
        }
      }
    );
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate presigned URL" },
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

export async function GET(request: NextRequest) {
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
    
    log("GET request received for presigned URL");
    
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('key');
    const userId = searchParams.get('userId');
    log("User ID from s3-bucket", userId);
    
    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required" },
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
    
    try {
      const downloadUrl = await presignDownload(fileName);
      const response = NextResponse.redirect(downloadUrl);
      
      // Add CORS headers to redirect
      response.headers.set(
        'Access-Control-Allow-Origin', 
        process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://codecanvas.digital'
      );
      
      return response;
    } catch (presignError: any) {
      console.error("Error generating download URL:", presignError);
      return NextResponse.json(
        { error: presignError.message || "Failed to generate download URL" },
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
  } catch(error:any) {
    console.error("Error processing download request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process download request" },
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

