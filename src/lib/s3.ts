//src/lib/s3.ts
"use server"
import 'dotenv/config';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { log, error } from 'console';


export async function presignUpload(key: string, contentType = 'video/webm') {
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

  const command = new PutObjectCommand({
    Bucket: "code-canvas-recordings",
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 3600,
  });

  log("Presigned URL:", signedUrl);
  
  return signedUrl;
}
export async function verifyS3Access() {
  try {
    const configuration = {
      region: 'us-east-2',
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
      console.error(`Status: ${bucketError.name} (${bucketError.$metadata?.httpStatusCode})`);
      console.error(`Message: ${bucketError.message}`);
      return false;
    }
  } catch (e: any) {
    console.error("ERROR: Failed to initialize S3 client:", e.message);
    return false;
  }
}

