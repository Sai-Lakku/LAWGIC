// data/scripts/ingest_interpreted_laws.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";

dotenv.config({ path: ".env.local" });

// 1. Directory with your JSON files
const DATA_DIR = path.join(process.cwd(), "../data/interpreted");

// 2. Connect to MongoDB
const client = new MongoClient(process.env.MONGODB_URI!);
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

async function main() {
  await client.connect();
  const db = client.db("LAWGIC-DB");
  const col = db.collection("laws");

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  console.log(`🧾 Found ${files.length} interpreted law files`);

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // Combine everything into one text string for embedding
    const textToEmbed = [
      json.title,
      json.text,
      JSON.stringify(json.rules || []),
      JSON.stringify(json.examples || []),
      JSON.stringify(json.variables || []),
    ].join("\n\n");

    const [embedding] = await embeddings.embedDocuments([textToEmbed]);

    await col.insertOne({
      id: json.id,
      url: json.url,
      title: json.title,
      repealed: json.repealed,
      content: textToEmbed,
      embedding,
      insertedAt: new Date(),
    });

    console.log(`✅ Inserted ${file}`);
  }

  await client.close();
  console.log("🎉 Done! All interpreted laws are now in MongoDB.");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  client.close();
});
