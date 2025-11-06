// law_as_code_chatbot/src/lib/vectorstore/setup.ts
// Log data from Mongo
// Splitting
// Adding to vectorstore
// Returning retriever
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import {embeddings} from "../llm/model";
import {loadMongoAsDocs} from "./loaders";
import {splitDocs} from "./splitter";

export const memory = new MemoryVectorStore(embeddings);
// export const memory = new MemoryVectorStore.fromDocuments([], null);

let retrievePromise: Promise<ReturnType<typeof memory.asRetriever>> | null = null;

export async function buildMemoryRetriever(k = 4) {
    if (!retrievePromise) {
        retrievePromise = (async () => {
            const docs = await loadMongoAsDocs();
            const splits = await splitDocs(docs);
            await memory.addDocuments(splits);
            return memory.asRetriever();
        })();
    }
    return retrievePromise;
}
// export async function buildMemoryRetriever(k = 4) {
//   if (!retrieverPromise) {
//     retrieverPromise = (async () => {
//       const embeddedDocs = await loadEmbeddedLaws(); // 从 Mongo 拿 content + embedding
//       await memory.addVectors(
//         embeddedDocs.map((d) => [d.embedding, d]) // 不再 embedding
//       );
//       return memory.asRetriever(k);
//     })();
//   }
//   return retrieverPromise;
// }