// law_as_code_chatbot/src/lib/vectorstore/setup.ts
// Log data from Mongo
// Splitting
// Adding to vectorstore
// Returning retriever
import {MemoryVectorStore} from "langchain/vectorstores/memory";
import {embeddings} from "../llm/model";
import {loadMongoAsDocs} from "../data/loaders";
import {splitDocs} from "../data/splitter";

export const memory = new MemoryVectorStore(embeddings);

let retrievePromise: Promise<ReturnType<typeof memory.asRetriever>> | null = null;

export async function buildMemoryRetriever( k = 4 ) {
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