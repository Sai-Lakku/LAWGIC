// law_as_code_chatbot/src/lib/vectorstore/setup.ts
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import type {Document as LCDocument} from "@langchain/core/documents";
import {embeddings} from "../llm/model";   
import {loadMongoAsDocs} from "./loaders";
import { loadEmbeddedLaws } from "./loaders";


export const memory = new MemoryVectorStore(embeddings);
// export const memory = new MemoryVectorStore.fromDocuments([], null);

let retrievePromise: 
    | Promise<ReturnType<typeof memory.asRetriever>> 
    | null = null;

// export async function buildMemoryRetriever(k = 4) {
//     if (!retrievePromise) {
//         retrievePromise = (async () => {
//             const docs = await loadMongoAsDocs();
//             const splits = await splitDocs(docs);
//             await memory.addDocuments(splits);
//             return memory.asRetriever();
//         })();
//     }
//     return retrievePromise;
// }
export async function buildMemoryRetriever(k = 4) {
    // if (!retrackerGuard()) return retrieverPromise!; //optional
    // if (!retrieverPromise) {
    retrievePromise = (async () => {
        const embeddedDocs = await loadEmbeddedLaws();
        // 拆成两个数组：vectors 和 documents
        const vectors = embeddedDocs.map((d) => d.embedding);
        const documents = embeddedDocs.map((d) => d.doc);

        // addVectors 需要两个独立的参数
        await memory.addVectors(vectors, documents);
        return memory.asRetriever(k);
        })();
    return retrievePromise;
}