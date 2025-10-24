// law_as_code_chatbot/src/lib/langfuse/langfuse.ts
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });


import { Langfuse } from "langfuse";

if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
  throw new Error("Langfuse keys not loaded!");
}

export const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  baseUrl: process.env.LANGFUSE_HOST!,
  // // @ts-ignore: bypass unsupported fetch hook
  // fetch: async (url, options) => {
  //   // 强制重写目标 URL
  //   const realUrl = url.replace("cloud.langfuse.com", "us.cloud.langfuse.com");
  //   return fetch(realUrl, options);
  // },
});