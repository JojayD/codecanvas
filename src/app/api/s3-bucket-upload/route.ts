import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { supabase } from "@/lib/supabase";
import { log } from "console";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';



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



const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
// Verify S3 access when the module is loaded

export async function POST(request: NextRequest) {
  console.log("Request received");
  try {
    const { fileName, userId } = await request.json();
    await verifyS3Access();
    if (!fileName) {
      return NextResponse.json(
        { error: "Missing fileName" },
        { status: 400 }
      );
    }
    console.log("User data:", userId);
    // Get file name and bucket name from request
    const objectKey = `${userId ?? 'anonymous'}/${fileName}`
    // Explicitly pass video/webm as the content type for recordings
    const presignedUrl = await presignUpload(objectKey)
    console.log("Presigned URL:", presignedUrl);
    log("Presigned URL on s3-bucket-upload/route.ts:", presignedUrl);
    // Return the URL as a simple string value, not a complex object
    return NextResponse.json({ url: presignedUrl });
  } catch (error) {
    console.error(error);
    // Fix: Return 500 error instead of misleading 405 method not allowed
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
