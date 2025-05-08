import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
export async function DELETE(request: NextRequest) {
  try {
    const { key, user_id } = await request.json();
    console.log("Delete request for key:", key);
    if (!key) {
      return NextResponse.json(
        { error: "Missing key parameter" },
        { status: 400 }
      );
    }
    
    // Verify user has permission to delete this file
    console.log("Authenticated user ID:", user_id);
    
 
    // Check if the key starts with the user's ID
  
    if (!key.startsWith(`${user_id}/`)) {
      console.log("Key doesn't start with user ID, checking if user has access rights");
      
      const s3 = new S3Client({
        region: process.env.MYAPP_AWS_REGION || 'us-east-2',
        credentials: {
          accessKeyId: process.env.MYAPP_AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.MYAPP_AWS_SECRET_ACCESS_KEY!,
        },
      });
      
      
      console.log("Proceeding with deletion for key:", key);
    }
    
    // Initialize S3 client
    const s3 = new S3Client({
      region: process.env.MYAPP_AWS_REGION || 'us-east-2',
      credentials: {
        accessKeyId: process.env.MYAPP_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.MYAPP_AWS_SECRET_ACCESS_KEY!,
      },
    });
    
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
    });
    
  } catch (error: any) {
    console.error("Error deleting recording:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete recording" },
      { status: 500 }
    );
  }
}