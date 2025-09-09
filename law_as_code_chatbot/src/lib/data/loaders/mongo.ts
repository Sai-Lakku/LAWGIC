

import type { Document as LCDocument } from "@langchain/core/documents";

export async function loadMongoAsDocs(): Promise<LCDocument[]> {
  return [
    {
      pageContent: "Nike Annual Report 2023: revenue was $51.2B",
      metadata: { source: "fake.mongo.collection", _id: "demo-1" },
    },
  ];
}