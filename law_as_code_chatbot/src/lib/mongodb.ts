import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

console.log("Mongo URI:", process.env.MONGODB_URI);

// Load environment variables from .env.local

dotenv.config({ path: path.resolve('.env.local') });


// Define interfaces

interface Variable { name: string; description: string;}
interface Example {[key: string]: any;}
interface Rule { rule: any; examples: Example[]; variables: Variable[]; consequences: string[];}
interface Statute {
  id: string;
  url: string;
  title: string;
  text: string;
  repealed: boolean;
  rules: Rule[];
}

// 2. Load JSON files

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const folderPath = path.join(__dirname, "../../public/interpreted");

function loadFiles(folderPath: string): Statute[] {
  
  const files = fs.readdirSync(folderPath);
  const combined: Statute[] = [];
  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const fullPath = path.join(folderPath, file);
      const rawData = fs.readFileSync(fullPath, "utf-8");
      const json: Statute = JSON.parse(rawData);
      combined.push(json);
    }
  });
  return combined;
}

// Push to MongoDB

async function pushToMongo(data: Statute[]) {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri || !dbName) {
    throw new Error("MONGODB_URI or MONGODB_DB not set in .env.local");
  }
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(dbName);
    const collection = db.collection("statutes");

    // clearing any previous data
    await collection.deleteMany({});
    const result = await collection.insertMany(data);

  } catch (err) {
    console.error("MongoDB connection failed:", err);
  } finally {
    await client.close();
  }
}

// Main script

async function main() {
  const combinedData = loadFiles(folderPath);
  await pushToMongo(combinedData);
  console.log("All data pushed to MongoDB successfully!");
}
main().catch((err) => console.error(err));
