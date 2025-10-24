// law_as_code_chatbot/src/lib/graph/nodes/generate.ts
import { InputStateAnnotation } from "../state";
import { StateAnnotation } from "../state";
import { llm } from "../../llm/model";
import { ragPrompt } from "../../llm/prompts";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// // non-streaming version
// export async function generate(state: typeof StateAnnotation.State) {
//   const docsContent = (state.context ?? []).map(d => d.pageContent).join("\n");
//   const messages = await ragPrompt.invoke({
//     question: state.question,
//     context: docsContent,
//   });
//   const response = await llm.invoke(messages);
//   return { answer: String(response.content ?? "") };
// }

export async function generate(state: typeof StateAnnotation.State) {
  const contextWithRefs = (state.context ?? []).map((d, i) => {
  const ref = `[${i + 1}] ${d.metadata.title} (${d.metadata.url})`;
  return `${ref}\n${d.pageContent}`;
}).join("\n\n");
  const references = (state.context ?? []).map(d => ({
  title: d.metadata.title,
  url: d.metadata.url,
  id: d.metadata.id,
}));
  const messages = await ragPrompt.invoke({
    question: state.question,
    context: contextWithRefs,
    references,
  });
  const response = await llm.invoke(messages);
  return {
    answer: String(response.content ?? ""),
    references
  };
}


// // streaming version
// export async function* generateStream(state: {
//   question: string;
//   context: Array<{ pageContent: string}>;
// }) {
//   const docsContent = (state.context ?? []).map(d => d.pageContent).join("\n");
//   const messages = await ragPrompt.invoke({
//     question: state.question,
//     context: docsContent,
//   });
//   const prompt = String(await ragPrompt.invoke({
//   question: state.question,
//   context: docsContent,
// }));
//   const {textStream} = streamText({
//     model: openai("gpt-4o"),
//     prompt
// });
//   for await (const textPart of textStream) {
//     yield textPart;
//   }
// }

// streaming version
export async function* generateStream({
  question,
  context,
  references,
}: {
  question: string;
  context: string;
  references?: Array<{ title: string; url?: string | null }>;
}) {
  // Build a context section that includes references visibly numbered
  const contextWithRefs = context + "\n\nReferences:\n" + 
    (references?.map((r, i) => `[${i + 1}] ${r.title} (${r.url})`).join("\n") ?? "");
  // const contextWithRefs = (state.context ?? [])
  // .map((d, i) => `[${i + 1}] ${d.metadata.title} (${d.metadata.url})\n${d.pageContent}`)
  // .join("\n\n");

  const messages = await ragPrompt.invoke({
    question,
    // context
    context: contextWithRefs,
  });
  const prompt = String(messages)

  // Stream from OpenAI
  const { textStream } = streamText({
    model: openai("gpt-4o"),
    prompt,
  });

  // Yield tokens as they arrive
  for await (const textPart of textStream) {
    yield textPart;
  }
}
