import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { log } from "console";

export async function POST(request: NextRequest) {
  try {
    // Increase the max size to handle large video files
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const userId = formData.get('userId') as string;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    // Create a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${userId || 'anonymous'}/${userId || 'anonymous'}-${timestamp}.webm`;
    
    // Convert Blob to Buffer for S3 upload
    const buffer = Buffer.from(await file.arrayBuffer());
    
    log("Uploading file:", {
      fileName,
      size: `${(buffer.length / (1024 * 1024)).toFixed(2)}MB`,
      userId
    });
    
    const s3 = new S3Client({
      region: 'us-east-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    const command = new PutObjectCommand({
      Bucket: "code-canvas-recordings",
      Key: fileName,
      Body: buffer,
      ContentType: "video/webm",
    });
    
    const result = await s3.send(command);
    
    log("Upload successful:", fileName);
    
    return NextResponse.json({
      success: true,
      key: fileName,
      url: `https://code-canvas-recordings.s3.us-east-2.amazonaws.com/${fileName}`
    });
  } catch (error: any) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Configure Next.js to handle larger file uploads (up to 100MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};