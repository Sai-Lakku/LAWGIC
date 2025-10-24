// law_as_code_chatbot/src/lib/graph/nodes/retrieve.ts
import {InputStateAnnotation} from "../state";
import { buildMemoryRetriever } from "../../vectorstore/setup";


export async function retrieve(state: typeof InputStateAnnotation.State) {
    const retriever = await buildMemoryRetriever();
    const docs = await retriever.getRelevantDocuments(state.question);
    return { context: docs };
}








// type RefItem = { title: string; url?: string | null; cite?: string | null };

// export async function retrieve(state: typeof InputStateAnnotation.State) {
//   const retriever = await buildMemoryRetriever();
//   const docs = await retriever.getRelevantDocuments(state.question);

//   const context = docs.map(d => d.pageContent ?? "").join("\n\n");

//   const references: RefItem[] = docs.map(d => ({
//     title: d.metadata?.title ?? "Unknown statute",
//     url: d.metadata?.url ?? null,
//     cite: d.metadata?.id ?? null,
//   }));

//   return { context, references };
// }