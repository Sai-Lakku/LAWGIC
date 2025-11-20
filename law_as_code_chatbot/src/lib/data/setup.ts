// law_as_code_chatbot/src/lib/data/setup.ts
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import type {Document as LCDocument} from "@langchain/core/documents";
import {embeddings} from "../llm/model";   
import {loadMongoAsDocs} from "./loaders";
import { loadEmbeddedLaws } from "./loaders";
import {MongoClient} from "mongodb"
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";

// dotenv.config({path: ".env.local"})

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB!;
const collectionName = "upgrade_laws";
const indexName = "vector_index";

const client = new MongoClient(uri);
await client.connect();
const collection = client.db(dbName).collection(collectionName);

export const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
  collection,
  indexName,
  textKey: "content",
  embeddingKey: "embedding",
});

export const retriever = vectorStore.asRetriever({
  k: 5,
});

export async function buildMemoryRetriever(k = 5) {
  console.log("✅ Using MongoDB Atlas Vector Search retriever instead of MemoryVectorStore.");
  return retriever;
}
