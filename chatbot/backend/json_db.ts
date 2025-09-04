import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  // MongoDB setup
  const mongoUrl = process.env.MONGODB_URI as string;
  const dbName = process.env.MONGODB_DB || "lawgic-db";
  const collectionName = process.env.MONGODB_COLLECTION || "statutes";

  if (!mongoUrl) {
    console.log("No MongoDB found");
    return;
  }

  const client = new MongoClient(mongoUrl);
  await client.connect();
  console.log("Connected to MongoDB");

  const db = client.db(dbName);

  // Read all JSON files
  const folder = "./interpreted";
  const files = fs.readdirSync(folder).filter(f => f.endsWith(".json")).sort();

  console.log(`Found ${files.length} JSON files`);

  const combined: any = {
    type: "combined_json_data",
    metadata: { totalFiles: files.length, combinedAt: new Date(), files: [] },
    data: {}
  };

  for (const file of files) {
    const content = fs.readFileSync(path.join(folder, file), "utf8");
    const json = JSON.parse(content);
    const name = file.replace(".json", "");
    combined.metadata.files.push(name);
    combined.data[name] = json;
    console.log("Read file:", file);
  }

  // Save combined JSON to DB
  const collection = db.collection(collectionName);
  await collection.replaceOne({ type: "combined_json_data" }, combined, { upsert: true });

  console.log("Combined JSON saved to MongoDB collection:", collectionName);

  await client.close();
  console.log("Disconnected from MongoDB");
}

main();
