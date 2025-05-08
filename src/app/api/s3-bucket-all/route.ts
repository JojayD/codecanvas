import 'dotenv/config';
import { NextRequest, NextResponse } from "next/server";
import { verifyS3Access } from "@/lib/s3";
import {ListObjectsV2Command, S3Client} from "@aws-sdk/client-s3";
import { log } from "console";


async function listUserFiles(userId: string) {
  const configuration = {
    region: process.env.MYAPP_AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.accessKeyId!,
      secretAccessKey: process.env.secretAccessKey!,
    },
  };
  
  if (process.env.DEVELOPMENT_MODE === 'true') {
    configuration.credentials = {
      accessKeyId: process.env.accessKeyId!,
      secretAccessKey: process.env.secretAccessKey!,
    }
  }

  const s3 = new S3Client(configuration);
  const creds = await s3.config.credentials!();
  console.log("Resolved creds:", {
    accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey ? "***" : undefined,
      sessionToken: creds.sessionToken,
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

    
    // Log actual region value (safe to log)
    console.log("AWS Region:", process.env.MYAPP_AWS_REGION || 'us-east-2');
    
    // Log first few characters of sensitive data (for debugging only)
    if (process.env.MYAPP_AWS_ACCESS_KEY_ID) {
      const prefix = process.env.accessKeyId!.substring(0, 4);
      const length = process.env.secretAccessKey!.length;
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