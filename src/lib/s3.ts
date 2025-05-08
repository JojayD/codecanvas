//src/lib/s3.ts
"use server"
import 'dotenv/config';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { log, error } from 'console';

// Add a debug helper function
export async function debugAwsCredentials() {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV || 'undefined',
    MYAPP_AWS_REGION: typeof process.env.MYAPP_AWS_REGION !== 'undefined' ? 
      (process.env.MYAPP_AWS_REGION || '[empty string]') : 'undefined',
    MYAPP_AWS_ACCESS_KEY_ID: typeof process.env.MYAPP_AWS_ACCESS_KEY_ID !== 'undefined' ? 
      (process.env.MYAPP_AWS_ACCESS_KEY_ID ? `${process.env.MYAPP_AWS_ACCESS_KEY_ID.substring(0, 4)}...` : '[empty string]') : 'undefined',
    MYAPP_AWS_SECRET_ACCESS_KEY: typeof process.env.MYAPP_AWS_SECRET_ACCESS_KEY !== 'undefined' ? 
      (process.env.MYAPP_AWS_SECRET_ACCESS_KEY ? '[PRESENT]' : '[empty string]') : 'undefined',
    DEVELOPMENT_MODE: typeof process.env.DEVELOPMENT_MODE !== 'undefined' ? 
      process.env.DEVELOPMENT_MODE : 'undefined',
  };

  console.log('Environment variables debug info:', JSON.stringify(envVars, null, 2));
  
  try {
    // Try to create an S3 client with minimal configuration
    const testConfig = getS3Config();
    
    

    const s3 = new S3Client(testConfig);
 
    try {
      const creds = await s3.config.credentials!();
      console.log("AWS SDK resolved credentials successfully:", {
        accessKeyId: creds.accessKeyId ? `${creds.accessKeyId.substring(0, 4)}...` : undefined,
        secretAccessKeyExists: !!creds.secretAccessKey,
        sessionTokenExists: !!creds.sessionToken,
      });
      return { success: true, message: "Credentials resolved successfully" };
    } catch (credError: any) {
      console.error("AWS SDK credential resolution failed:", credError.message);
      return { 
        success: false, 
        message: `Credential resolution failed: ${credError.message}`,
        error: credError
      };
    }
  } catch (e: any) {
    console.error("Failed to create test S3 client:", e.message);
    return { success: false, message: `S3 client creation failed: ${e.message}`, error: e };
  }
}

// Centralized function to get S3 configuration
export async function getS3Config() {
  // Default region
  const region = process.env.MYAPP_AWS_REGION || 'us-east-2';
  
  // Check if we have the required credentials
  const hasMainCredentials = !!process.env.MYAPP_AWS_ACCESS_KEY_ID && !!process.env.MYAPP_AWS_SECRET_ACCESS_KEY;
  
  // Base configuration
  const config: any = { region };
  
  // Only add credentials if they exist
  if (hasMainCredentials) {
    config.credentials = {
      accessKeyId: process.env.MYAPP_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.MYAPP_AWS_SECRET_ACCESS_KEY!,
    };
  } else {
    console.warn("WARNING: Missing MYAPP_AWS_* credentials. AWS SDK will attempt to use default credential providers.");
  }
  
  return config;
}

export async function presignUpload(key: string, contentType = 'video/webm') {
  // First run diagnostics
  await debugAwsCredentials();
  
  const s3 = new S3Client(getS3Config());

  const command = new PutObjectCommand({
    Bucket: "code-canvas-recordings",
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
  // First run diagnostics
  const diagnostics = await debugAwsCredentials();
  if (!diagnostics.success) {
    console.error("AWS credential diagnostics failed:", diagnostics.message);
  }

  try {
    console.log("---------- DEBUGGING AWS CREDENTIALS ----------");
    
    // Check environment variables existence (not values)
    console.log("Environment Variables Check:");
    console.log("- MYAPP_AWS_REGION exists:", typeof process.env.MYAPP_AWS_REGION !== 'undefined');
    console.log("- MYAPP_AWS_ACCESS_KEY_ID exists:", typeof process.env.MYAPP_AWS_ACCESS_KEY_ID !== 'undefined');
    console.log("- MYAPP_AWS_SECRET_ACCESS_KEY exists:", typeof process.env.MYAPP_AWS_SECRET_ACCESS_KEY !== 'undefined');
    
    // Development mode variables
    console.log("- DEVELOPMENT_MODE:", process.env.DEVELOPMENT_MODE);
    
    // Check for empty strings
    console.log("Empty String Check:");
    console.log("- MYAPP_AWS_REGION is empty:", process.env.MYAPP_AWS_REGION === '');
    console.log("- MYAPP_AWS_ACCESS_KEY_ID is empty:", process.env.MYAPP_AWS_ACCESS_KEY_ID === '');
    console.log("- MYAPP_AWS_SECRET_ACCESS_KEY is empty:", process.env.MYAPP_AWS_SECRET_ACCESS_KEY === '');
    
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

