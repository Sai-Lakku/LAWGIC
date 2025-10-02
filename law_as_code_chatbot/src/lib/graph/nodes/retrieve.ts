// retrieve.ts
import {InputStateAnnotation} from "../state";
import { buildMemoryRetriever } from "../../indexing/buildIndex";



export async function retrieve(state: typeof InputStateAnnotation.State) {
    const retriever = await buildMemoryRetriever();
    const docs = await retriever.getRelevantDocuments(state.question);
    return { context: docs };
}
