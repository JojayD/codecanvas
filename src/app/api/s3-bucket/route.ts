import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadBucketCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { supabase } from "@/lib/supabase";
import { log } from "console";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


export const presignDownload = async (key: string) => {
   const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const command = new GetObjectCommand({
    Bucket: "code-canvas-recordings",
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 3600,
  });
  log("Presigned URL:", signedUrl);
  return signedUrl;
}





export async function presignUpload(key: string) {
  const s3 = new S3Client({
    region: 'us-east-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    
  });

  const command = new PutObjectCommand({
    Bucket: "code-canvas-recordings",
    Key: key,
    ContentType: "video/webm",
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 3600,
  });

  log("Presigned URL:", signedUrl);
  
  return signedUrl;
}

export async function verifyS3Access() {
  try {
    console.log("Initializing S3 client with credentials:");
    console.log("  Access Key ID:", process.env.AWS_ACCESS_KEY_ID?.substring(0, 5) + "..." || "MISSING");
    console.log("  Secret Access Key:", process.env.AWS_SECRET_ACCESS_KEY ? "[PRESENT]" : "MISSING");
    console.log("  Region:", process.env.AWS_REGION || "us-east-2");
    
    const s3 = new S3Client({
      region: 'us-east-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    // Check if bucket exists
    const bucketName = "code-canvas-recordings";
    console.log(`Verifying bucket '${bucketName}' exists and is accessible...`);
    
    const headBucketCommand = new HeadBucketCommand({ Bucket: bucketName });
    
    try {
      await s3.send(headBucketCommand);
      console.log(`✅ SUCCESS: Bucket '${bucketName}' exists and is accessible.`);
      return true;
    } catch (bucketError: any) {
      console.error(`❌ ERROR: Cannot access bucket '${bucketName}':`);
      console.error(`   Status: ${bucketError.name} (${bucketError.$metadata?.httpStatusCode})`);
      console.error(`   Message: ${bucketError.message}`);
      return false;
    }
  } catch (e: any) {
    console.error("❌ ERROR: Failed to initialize S3 client:", e.message);
    return false;
  }
}



// Verify S3 access when the module is loaded

export async function POST(request: NextRequest) {
  console.log("Presigned URL request received");
  
  try {
    // Verify S3 access first - this helps debug permission issues
    await verifyS3Access();
    
    const { fileName, userId } = await request.json();
  
    if (!fileName) {
      return NextResponse.json(
        { error: "Missing fileName" },
        { status: 400 }
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
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  await verifyS3Access();
  log("GET request received for presigned URL");
  try{
      const { searchParams } = new URL(request.url);
      const fileName = searchParams.get('key');
      const userId = searchParams.get('userId');
      log("User ID from s3-bucket", userId);
      if (!fileName) {
        return NextResponse.json(
          { error: "fileName is required" },
          { status: 400 }
        );
      }
      const downloadUrl = await presignDownload(fileName);
      return NextResponse.redirect(downloadUrl);
      
      
  }catch(error:any){
      console.error("Error generating presigned URL:", error);
      return NextResponse.json(
        { error: error.message || "Failed to generate presigned URL" },
        { status: 500 }
      );
  }
}

