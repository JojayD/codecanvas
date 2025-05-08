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
      accessKeyId: process.env.MYAPP_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.MYAPP_AWS_SECRET_ACCESS_KEY!,
    },
  };
  
  if (process.env.DEVELOPMENT_MODE === 'true') {
    configuration.credentials = {
      accessKeyId: process.env.MYAPP_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.MYAPP_AWS_SECRET_ACCESS_KEY!,
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
    console.log("---------- DEBUGGING AWS CREDENTIALS ----------");
    
    // Check environment variables existence (not values)
    console.log("Environment Variables Check:");
    console.log("- AWS_REGION exists:", typeof process.env.MYAPP_AWS_REGION !== 'undefined');
    console.log("- AWS_ACCESS_KEY_ID exists:", typeof process.env.MYAPP_AWS_ACCESS_KEY_ID !== 'undefined');
    console.log("- AWS_SECRET_ACCESS_KEY exists:", typeof process.env.MYAPP_AWS_SECRET_ACCESS_KEY !== 'undefined');
    
    // Development mode variables
    console.log("- DEVELOPMENT_MODE:", process.env.DEVELOPMENT_MODE);
    console.log("- AWS_ACCESS_KEY exists:", typeof process.env.AWS_ACCESS_KEY !== 'undefined');
    console.log("- AWS_SECRET_KEY exists:", typeof process.env.AWS_SECRET_KEY !== 'undefined');
    
    // Check for empty strings
    console.log("Empty String Check:");
    console.log("- AWS_REGION is empty:", process.env.MYAPP_AWS_REGION === '');
    console.log("- AWS_ACCESS_KEY_ID is empty:", process.env.MYAPP_AWS_ACCESS_KEY_ID === '');
    console.log("- AWS_SECRET_ACCESS_KEY is empty:", process.env.MYAPP_AWS_SECRET_ACCESS_KEY === '');
    
    if (process.env.DEVELOPMENT_MODE === 'true') {
      console.log("- DEV AWS_ACCESS_KEY is empty:", process.env.AWS_ACCESS_KEY === '');
      console.log("- DEV AWS_SECRET_KEY is empty:", process.env.AWS_SECRET_KEY === '');
    }
    
    // Log actual region value (safe to log)
    console.log("AWS Region:", process.env.MYAPP_AWS_REGION || 'us-east-2');
    
    // Log first few characters of sensitive data (for debugging only)
    if (process.env.MYAPP_AWS_ACCESS_KEY_ID) {
      const prefix = process.env.MYAPP_AWS_ACCESS_KEY_ID.substring(0, 5) + "..." || "MISSING";
      console.log("  Access Key ID:", prefix);
    }
    console.log("  Secret Access Key:", process.env.MYAPP_AWS_SECRET_ACCESS_KEY ? "[PRESENT]" : "MISSING");
    
    const configuration = {
      region: 'us-east-2',
      credentials: {
        accessKeyId: process.env.MYAPP_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.MYAPP_AWS_SECRET_ACCESS_KEY!,
      },
    };
    
    if (process.env.DEVELOPMENT_MODE === 'true') {
      configuration.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_KEY!,
      }
      console.log("Using development mode credentials");
    }

    const s3 = new S3Client(configuration);
    
    // Debug credentials to verify they're properly resolved
    try {
      const creds = await s3.config.credentials!();
      console.log("Resolved S3 credentials:", {
        accessKeyId: creds.accessKeyId ? creds.accessKeyId.substring(0, 4) + "..." : undefined,
        secretAccessKey: creds.secretAccessKey ? "***" : undefined,
        sessionToken: creds.sessionToken ? "Present" : "None",
      });
    } catch (error) {
      console.error("Failed to resolve credentials:", error);
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
      console.error(`Status: ${bucketError.name} (${bucketError.$metadata?.httpStatusCode})`);
      console.error(`Message: ${bucketError.message}`);
      return false;
    }
  } catch (e: any) {
    console.error("ERROR: Failed to initialize S3 client:", e.message);
    return false;
  }
}

