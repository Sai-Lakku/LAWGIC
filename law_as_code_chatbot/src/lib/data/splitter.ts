import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type {Document as LCDocument} from "@langchain/core/documents";
export const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});
export async function splitDocs(docs: LCDocument[]) {
    return splitter.splitDocuments(docs);
}