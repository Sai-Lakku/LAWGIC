import {InputStateAnnotation} from "../state.js";
import {StateAnnotation} from "../state.js";
// import {promptTemplate} from "../../prompts/chat.js";
import { llm} from "../../llm/model.js";
import { ragPrompt } from "../../prompts/rag.js";

export async function generate(state: typeof StateAnnotation.State) {
  const docsContent = (state.context ?? []).map(d => d.pageContent).join("\n");
  const messages = await ragPrompt.invoke({
    question: state.question,
    context: docsContent,
  });
  const response = await llm.invoke(messages);
  return { answer: String(response.content ?? "") };
}