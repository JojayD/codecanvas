// src/lib/dynamodb.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export const saveCodeDocument = async (documentId: string, content: string, language: string, userId: string) => {
  const command = new PutCommand({
    TableName: "CodeEditorDocuments",
    Item: {
      documentId,
      userId,
      content,
      language,
      lastUpdated: new Date().toISOString(),
    },
  });

  return await docClient.send(command);
};

export const getCodeDocument = async (documentId: string) => {
  const command = new GetCommand({
    TableName: "CodeEditorDocuments",
    Key: { documentId },
  });

  return await docClient.send(command);
};

export const savePrompt = async (documentId: string, prompt: string) => {
  const command = new PutCommand({
    TableName: "Prompts",
    Item: {
      documentId,
      prompt,
      lastUpdated: new Date().toISOString(),
    },
  });

  return await docClient.send(command);
}