export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { verifyS3Access } from "@/lib/s3";

// Add OPTIONS handler for preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://codecanvas.digital',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-amz-content-sha256, x-amz-date, Authorization, x-amz-security-token',
      'Access-Control-Max-Age': '3000'
    }
  });
}

export async function DELETE(request: NextRequest) {
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
    
    const { key, user_id } = await request.json();
    console.log("Delete request for key:", key);
    if (!key) {
      return NextResponse.json(
        { error: "Missing key parameter" },
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
    
    // Verify user has permission to delete this file
    console.log("Authenticated user ID:", user_id);
    
 
    // Check if the key starts with the user's ID
  
    if (!key.startsWith(`${user_id}/`)) {
      console.log("Key doesn't start with user ID, checking if user has access rights");
      
      const configuration = {
        region: process.env.MYAPP_AWS_REGION || 'us-east-2',
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
      }

      const s3 = new S3Client(configuration);
      
      console.log("Proceeding with deletion for key:", key);
    }
    
    // Initialize S3 client
    const configuration = {
      region: process.env.MYAPP_AWS_REGION || 'us-east-2',
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
    }

    const s3 = new S3Client(configuration);
    
    // Debug credentials to verify they're resolved
    try {
      const creds = await s3.config.credentials!();
      console.log("Resolved S3 credentials:", {
        accessKeyId: creds.accessKeyId ? creds.accessKeyId.substring(0, 4) + "..." : undefined,
        secretAccessKey: creds.secretAccessKey ? "***" : undefined,
        sessionToken: creds.sessionToken ? "Present" : "None",
      });
    } catch (error) {
      console.error("Failed to resolve credentials:", error);
    }
    
    // Create delete command
    const deleteCommand = new DeleteObjectCommand({
      Bucket: "code-canvas-recordings",
      Key: key
    });
    
    await s3.send(deleteCommand);
    console.log("Successfully deleted recording:", key);
    
    return NextResponse.json({ 
      success: true, 
      message: "Recording deleted successfully" 
    }, {
      headers: {
        'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : 'https://codecanvas.digital',
        'Access-Control-Expose-Headers': 'ETag'
      }
    });
    
  } catch (error: any) {
    console.error("Error deleting recording:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete recording" },
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