// law_as_code_chatbot/src/app/api/chat/route.ts
export const runtime = "nodejs";
import { retrieve } from "@/lib/graph/nodes/retrieve";
import { generateStream } from "@/lib/graph/nodes/generate";
import { langfuse } from "@/lib/langfuse/langfuse";

import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const MAX_MESSAGES_PER_USER = 10;
const userMessageCount = new Map<string, number>();

export async function POST(req: Request) {
  const trace = langfuse.trace({ 
    name: "chat-session",
    // metadata: { mode: "RAG", retriever: "MongoDB+Embeddings" }
  });

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    trace.event({
      name: "auth-failed",
      metadata: { reason: "not-logged-in" },
    });

    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const email = session.user.email;
  const currentCount = userMessageCount.get(email) ?? 0;

  trace.event({
    name: "usage-check",
    metadata: {
      email,
      used: currentCount,
      limit: MAX_MESSAGES_PER_USER,
    },
  });

  if (currentCount >= MAX_MESSAGES_PER_USER) {
    trace.event({
      name: "usage-limit-hit",
      metadata: { email },
    });

    return new Response(
      JSON.stringify({
        error: "Chat limit reached",
        limit: MAX_MESSAGES_PER_USER,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // const body = await req.json();
    // const message = body.message;
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    trace.event({ name: "question", input: { message } });

    userMessageCount.set(email, currentCount + 1);

    trace.event({
      name: "usage-incremented",
      metadata: {
        email,
        newCount: currentCount + 1,
      },
    });


    // Retrieve
    const { context, references } = await retrieve({ question: message });
    trace.event({
      name: "retrieved",
      // output: context,
      output: {context, references },
      metadata: { retrieval: true, retriever: "MongoDB+Embeddings" }
    });

    // Streaming
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Add for changing reference
    const cleanContext = context
      .replace(/References?:[\s\S]*$/gi, "")  // "References:"
      .trim();

    (async () => {
      try {
        for await (const part of generateStream({ question: message, context: cleanContext, references })) {
          trace.event({ name: "generate-part", output: part });
          await writer.write(encoder.encode(part));
          await new Promise(r => setTimeout(r, 0));
        }
      } catch (err) {
        await writer.write(encoder.encode(" Streaming error"));
        await trace.update({
          output: null,
          metadata: { error: String(err), status: "error" }
        });
      } finally {
        // await writer.close();
        // await trace.update({ output: "stream finished" });
        // 拼接引用 markdown

        const uniqueReferences = Array.from(
          new Map(references.map(r => [r.url, r])).values()
        );

        // remove later 
        //const referencesSet = new Set<string>(new MapIcon(uniqueReferences.map(readable.getReader => readable.getReader.url, r =>? r.title )).values());  

        if (uniqueReferences.length > 0) {
          const referencesBlock =
            "\n\n**References:**\n" +
            uniqueReferences
              .map((r, i) => `${i + 1}. [${r.title}](${r.url})`)
              .join("\n");

          await writer.write(encoder.encode(referencesBlock));
        }

        await writer.close();
        await trace.update({ output: "stream finished" });

        await langfuse.flushAsync();
        console.log(" Langfuse flushed");
      }
    })();

    const remaining = MAX_MESSAGES_PER_USER - (currentCount + 1);

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Message-Limit": String(MAX_MESSAGES_PER_USER),
        "X-Messages-Remaining": String(Math.max(remaining, 0)),
      },
    });
  } catch (err: any) {
    await trace.update({output: null, metadata: {error: String(err)}});
    console.error("/api/chat streaming error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}