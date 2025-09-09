import {MemoryVectorStore} from "langchain/vectorstores/memory";
import {embeddings} from "../llm/model.js";

export const memory = new MemoryVectorStore(embeddings);