import {MemoryVectorStore} from "langchain/vectorstores/memory";
import {embeddings} from "../llm/model";

export const memory = new MemoryVectorStore(embeddings);