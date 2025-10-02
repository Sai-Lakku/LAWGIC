import { MongoClient } from "mongodb";
import { Document } from "langchain/document";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB as string;

if (!uri || !dbName) {
  throw new Error("Missing MONGODB_URI or MONGODB_DB in .env.local");
}

// Use global cache to avoid creating multiple connections during hot reload (common in Next.js)
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

/**
 * Load all documents from the "statutes" collection
 * and convert them into LangChain Document objects
 */
export async function loadMongoAsDocs() {
  const client = await clientPromise;
  const db = client.db(dbName);
  const collection = db.collection("statutes");

  const rawDocs = await collection.find({}).toArray();

  // Convert Mongo docs → LangChain Document
  const docs = rawDocs.map(
    (doc) =>
      new Document({
        pageContent: doc.text ?? "", // main content of the law
        metadata: {
          id: doc.id,
          url: doc.url,
          title: doc.title,
          repealed: doc.repealed,
          rules: doc.rules,
          _id: doc._id.toString(), // keep original Mongo _id if useful
        },
      })
  );

  return docs;
}
