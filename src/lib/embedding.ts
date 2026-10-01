import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

function cleanErrorContext(text: string): string {
  return text
    .replace(/0x[a-fA-F0-9]+/g, "[HEX]")
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, "[UUID]")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, "[TIME]")
    .replace(/(\/|\b[A-Za-z]:\\)[^\s:]+[\/\\]/g, "")
    .trim();
}

export interface ErrorLogInput {
  serviceName: string;
  message: string;
  stackTrace: string;
}

export async function generateErrorEmbedding(error: ErrorLogInput): Promise<number[]> {
  const sanitizedMessage = cleanErrorContext(error.message);
  const sanitizedTrace = cleanErrorContext(
    error.stackTrace.split("\n").slice(0, 5).join("\n")
  );

  const fingerprint = `Service: ${error.serviceName}\nError: ${sanitizedMessage}\nTrace:\n${sanitizedTrace}`;

  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: fingerprint,
    config: {
      outputDimensionality: 768,
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (!values || values.length === 0) {
    throw new Error("Failed to generate vector embedding from Gemini API"); // This error will be caught in the calling function (bullMQ or the queue processor)
  }

  return values;
}