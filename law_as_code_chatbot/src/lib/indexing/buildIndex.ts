import {memory} from "../vectorstore/memory.js";
import {loadMongoAsDocs} from "../data/loaders/mongo.js";
import {splitDocs} from "../data/splitter.js";
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