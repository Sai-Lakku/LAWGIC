import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function GET() {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;

    if (!uri || !dbName) {
      throw new Error("Missing MONGODB_URI or MONGODB_DB in .env.local");
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    console.log("✅ Mongo connected, collections:", collections.map(c => c.name));

    return NextResponse.json({ ok: true, collections });
  } catch (err: any) {
    console.error("❌ Mongo test error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
