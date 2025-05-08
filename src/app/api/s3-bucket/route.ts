export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, HeadBucketCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { supabase } from "@/lib/supabase";
import { log } from "console";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, debugAwsCredentials, verifyS3Access } from "@/lib/s3";

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
  // Create a new S3 client using default credential provider chain
  const s3 = createS3Client();
  console.log("S3 client created for download");
  
  const bucketName = process.env.S3_BUCKET_NAME || "code-canvas-recordings";
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 3600,
  });
  log("Presigned URL:", signedUrl);
  return signedUrl;
}

const presignUpload = async (key: string, contentType = 'video/webm') => {
  // Create a new S3 client using default credential provider chain
  const s3 = createS3Client();
  console.log("S3 client created for upload");
  
  const bucketName = process.env.S3_BUCKET_NAME || "code-canvas-recordings";
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 3600,
  });

  return signedUrl;
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

