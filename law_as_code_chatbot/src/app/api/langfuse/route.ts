// law_as_code_chatbot/src/app/api/langfuse/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.text();

  const res = await fetch("https://us.cloud.langfuse.com/api/public/ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-langfuse-public-key": process.env.LANGFUSE_PUBLIC_KEY!,
      "x-langfuse-secret-key": process.env.LANGFUSE_SECRET_KEY!,
    },
    body,
  });

  const data = await res.text();

  return new NextResponse(data, { status: res.status });
}
