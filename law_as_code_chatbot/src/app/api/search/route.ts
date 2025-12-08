// law_as_code_chatbot/src/app/api/search/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import OpenAI from "openai";

const client = new MongoClient(process.env.MONGODB_URI!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  console.log("hit /api/search");
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // 1️ Create embedding for the user query
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const queryEmbedding = embeddingRes.data[0].embedding;

  // 2️ Connect to MongoDB
  await client.connect();
  const db = client.db("LAWGIC-DB");
  const collection = db.collection("laws");

  // 3️ Perform vector search
  const results = await collection.aggregate([
    {
      $vectorSearch: {
        index: "law_embeddings_index", // your index name
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: 5,
      },
    },
    {
      $project: {
        _id: 0,
        id: 1,
        title: 1,
        url: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]).toArray();

  // 4️ Return top results
  return NextResponse.json({ results });
}
