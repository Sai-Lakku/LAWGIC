import {InputStateAnnotation} from "../state.js";
import { buildMemoryRetriever } from "../../indexing/buildIndex.js";



export async function retrieve(state: typeof InputStateAnnotation.State) {
    const retriever = await buildMemoryRetriever();
    const docs = await retriever.getRelevantDocuments(state.question);
    return { context: docs };
}
