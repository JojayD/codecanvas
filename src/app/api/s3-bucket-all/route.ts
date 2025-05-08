import { NextRequest, NextResponse } from "next/server";
import { verifyS3Access } from "@/lib/s3";
import {ListObjectsV2Command, S3Client} from "@aws-sdk/client-s3";
import { log } from "console";


 async function listUserFiles(userId: string) {
  const s3 = new S3Client({
    region: process.env.MYAPP_AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.MYAPP_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.MYAPP_AWS_SECRET_ACCESS_KEY!,
    },
  });
  const command = new ListObjectsV2Command({
    Bucket: 'code-canvas-recordings',
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
  console.log("---------- DEBUGGING AWS CREDENTIALS ----------");
  
  // Check environment variables existence (not values)
  console.log("Environment Variables Check:");
  console.log("- AWS_REGION exists:", typeof process.env.MYAPP_AWS_REGION !== 'undefined');
  console.log("- AWS_ACCESS_KEY_ID exists:", typeof process.env.MYAPP_AWS_ACCESS_KEY_ID !== 'undefined');
  console.log("- AWS_SECRET_ACCESS_KEY exists:", typeof process.env.MYAPP_AWS_SECRET_ACCESS_KEY !== 'undefined');
  
  // Check for empty strings
  console.log("Empty String Check:");
  console.log("- AWS_REGION is empty:", process.env.MYAPP_AWS_REGION === '');
  console.log("- AWS_ACCESS_KEY_ID is empty:", process.env.MYAPP_AWS_ACCESS_KEY_ID === '');
  console.log("- AWS_SECRET_ACCESS_KEY is empty:", process.env.MYAPP_AWS_SECRET_ACCESS_KEY === '');
  
  // Log actual region value (safe to log)
  console.log("AWS Region:", process.env.MYAPP_AWS_REGION || 'us-east-2');
  
  // Log first few characters of sensitive data (for debugging only)
  if (process.env.MYAPP_AWS_ACCESS_KEY_ID) {
    const prefix = process.env.MYAPP_AWS_ACCESS_KEY_ID.substring(0, 4);
    const length = process.env.MYAPP_AWS_ACCESS_KEY_ID.length;
    console.log(`Access Key ID format: ${prefix}... (${length} chars)`);
  }
  await verifyS3Access();
  try{
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');
      log("User ID from s3-bucket-all:", userId);
      if (!userId) {
        return NextResponse.json(
          { error: "userId is required" },
          { status: 400 }
        );
      }
      const res = await listUserFiles(userId);
      return NextResponse.json(
        { success: true, files: res },
      )
  }catch(error:any){
      console.error("Error generating presigned URL:", error);
      return NextResponse.json(
        { error: error.message || "Failed to generate presigned URL" },
        { status: 500 }
      );
  }
}