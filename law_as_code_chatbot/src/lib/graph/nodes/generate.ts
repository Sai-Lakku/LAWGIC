// generate.ts
import {InputStateAnnotation} from "../state";
import {StateAnnotation} from "../state";
import { llm} from "../../llm/model";
import { ragPrompt } from "../../llm/prompts";

import {streamText} from "ai";
import {openai} from "@ai-sdk/openai";

// non-streaming version
export async function generate(state: typeof StateAnnotation.State) {
  const docsContent = (state.context ?? []).map(d => d.pageContent).join("\n");
  const messages = await ragPrompt.invoke({
    question: state.question,
    context: docsContent,
  });
  const response = await llm.invoke(messages);
  return { answer: String(response.content ?? "") };
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
  references
}: {
  question: string;
  context: string;  
  references?: Array<{ title: string; url?: string | null; cite?: string | null }>;
}) {

  const messages = await ragPrompt.invoke({
    question,
    context,
  });

  const prompt = String(await ragPrompt.invoke({
    question,
    context,
  }));

  const { textStream } = streamText({
    model: openai("gpt-4o"),
    prompt,
  });

  for await (const textPart of textStream) {
    yield textPart;
  }
}