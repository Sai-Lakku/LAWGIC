// law_as_code_chatbot/src/app/api/chat/route.ts
export const runtime = "nodejs";
import { retrieve } from "@/lib/graph/nodes/retrieve";
import { generateStream } from "@/lib/graph/nodes/generate";
import { langfuse } from "@/lib/langfuse";

// console.log("🔥 Chat route reached");
// console.log("process.release:", process.release);
// console.log("env check:", process.env.LANGFUSE_HOST);

export async function POST(req: Request) {
  const trace = langfuse.trace({ 
    name: "chat-session",
    // metadata: { mode: "RAG", retriever: "MongoDB+Embeddings" }
  });

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

    // Retrieve
    const { context } = await retrieve({ question: message });
    trace.event({
      name: "retrieved",
      output: context,
      metadata: { retrieval: true, retriever: "MongoDB+Embeddings" }
    });

    // Streaming
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();


    (async () => {
      try {
        for await (const part of generateStream({ question: message, context })) {
          trace.event({ name: "generate-part", output: part });
          await writer.write(encoder.encode(part));
          await new Promise(r => setTimeout(r, 0));
        }
      } catch (err) {
        await writer.write(encoder.encode("⚠️ Streaming error"));
        await trace.update({
          output: null,
          metadata: { error: String(err), status: "error" }
        });
      } finally {
        await writer.close();
        await trace.update({ output: "stream finished" });
        await langfuse.flushAsync();
        console.log("✅ Langfuse flushed");
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
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