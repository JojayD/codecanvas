//src/lib/s3.ts
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { log, error } from 'console';

// Helper to create an S3 client with default credential provider chain
export function createS3Client() {
  const region = process.env.MYAPP_AWS_REGION || process.env.AWS_REGION || 'us-east-2';
  return new S3Client({ region });
}

// Add a debug helper function
export async function debugAwsCredentials() {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV || 'undefined',
    MYAPP_AWS_REGION: typeof process.env.MYAPP_AWS_REGION !== 'undefined' ? 
      (process.env.MYAPP_AWS_REGION || '[empty string]') : 'undefined',
    S3_BUCKET_NAME: typeof process.env.S3_BUCKET_NAME !== 'undefined' ?
      process.env.S3_BUCKET_NAME : 'undefined',
  };

  console.log('Environment variables debug info:', JSON.stringify(envVars, null, 2));
  
  try {
    const s3 = createS3Client();
    console.log("S3 client created with region:", s3.config.region);
    return { success: true, message: "S3 client created successfully" };
  } catch (e: any) {
    console.error("Failed to create S3 client:", e.message);
    return { success: false, message: `S3 client creation failed: ${e.message}`, error: e };
  }
}

export async function presignUpload(key: string, contentType = 'video/webm') {
  const s3 = createS3Client();
  const bucketName = process.env.S3_BUCKET_NAME || "code-canvas-recordings";
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  try {
    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 3600,
    });

    log("Presigned URL:", signedUrl);
    return signedUrl;
  } catch (error: any) {
    console.error("Error generating presigned URL:", error.message);
    throw error;
  }
}

export async function verifyS3Access() {
  try {
    console.log("---------- DEBUGGING AWS CREDENTIALS ----------");
    
    // Check environment variables existence (not values)
    console.log("Environment Variables Check:");
    console.log("- MYAPP_AWS_REGION exists:", typeof process.env.MYAPP_AWS_REGION !== 'undefined');
    console.log("- S3_BUCKET_NAME exists:", typeof process.env.S3_BUCKET_NAME !== 'undefined');
    
    const s3 = createS3Client();
    console.log("S3 client created for region:", s3.config.region);
    
    // Check if bucket exists
    const bucketName = process.env.S3_BUCKET_NAME || "code-canvas-recordings";
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
    console.error(" ERROR: Failed to verify S3 access:", e.message);
    return false;
  }
}

