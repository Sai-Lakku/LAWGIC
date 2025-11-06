// data/scripts/ingest_unrepealed_laws.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";

dotenv.config({ path: ".env.local" });

// 1. Directory with your raw JSON law files
const DATA_DIR = path.join(process.cwd(), "../data/chapters/default"); // <-- adjust if needed

// 2. MongoDB setup
const client = new MongoClient(process.env.MONGODB_URI!);
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

async function main() {
  await client.connect();
  const db = client.db("LAWGIC-DB");
//   const col = db.collection("new_laws");
  const col = db.collection("law_without_reference");

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  console.log(`🧾 Found ${files.length} total law files`);

// ⏩ resume index if you’ve partially embedded already
  const startIndex = 2400; // change this to wherever you want to resume
  const filesToProcess = files.slice(startIndex);

  let inserted = 0;
  let skipped = 0;

  for (const file of filesToProcess) {
    const filePath = path.join(DATA_DIR, file);
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // 🛑 Skip repealed or empty-text statutes
    if (json.repealed === true || !json.text) {
      skipped++;
      continue;
    }

    // ✅ Prepare text for embedding
    const MAX_CHARS = 30000;
    // 🧹 Clean trailing "References:" section if present
    const textToEmbed = [json.title, json.text]
    .filter(Boolean)
    .join("\n\n")
    .replace(/References?[\s\S]*$/gi, "") // 移除从 "References:" 开始到文件末尾的所有内容
    .trim();

    // Skip or trim overly long text
    if (textToEmbed.length > MAX_CHARS) {
    console.log(`⚠️ Skipping ${json.id} (${textToEmbed.length} chars > limit)`);
    skipped++;
    continue;
    }

    // 🧠 Get embedding
    const [embedding] = await embeddings.embedDocuments([textToEmbed]);

    // 💾 Insert into Mongo
    await col.insertOne({
      id: json.id,
      url: json.url,
      title: json.title,
      repealed: false,
      content: textToEmbed,
      embedding,
      insertedAt: new Date(),
    });

    inserted++;
    if (inserted % 100 === 0) {
      console.log(`✅ Inserted ${inserted} docs so far...`);
    }
  }

  console.log(`🎯 Done! Inserted ${inserted}, skipped ${skipped}`);
  await client.close();
  console.log("🎉 All unrepealed laws embedded into MongoDB.");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  client.close();
});
