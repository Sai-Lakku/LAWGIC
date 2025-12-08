// // law_as_code_chatbot/src/lib/graph/nodes/retrieve.ts
// import {InputStateAnnotation} from "../state";
// import {buildMemoryRetriever} from "../../data/setup";


// type RefItem = { title: string; url?: string | null; cite?: string | null };

// export async function retrieve(state: typeof InputStateAnnotation.State) {
//   // get retriever
//   const retriever = await buildMemoryRetriever();

//   // search for relevant documents
//   const docs = await retriever.invoke(state.question);

//   // combine content for context
//   const context = docs.map((d: any) => d.pageContent ?? "").join("\n\n");

//   // digest references for citations
//   const references: RefItem[] = docs.map((d: any) => ({
//     title: d.metadata?.title ?? "Unknown statute",
//     url: d.metadata?.url ?? null,
//     cite: d.metadata?.id ?? null,
//   }));

//   console.log(`🔍 Retrieved ${docs.length} docs from Mongo Atlas Search for question: "${state.question}"`);

//   return { context, references };
// }




// law_as_code_chatbot/src/lib/graph/nodes/retrieve.ts
import { InputStateAnnotation } from "../state";
import connectDB from "../../databse_user/db";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

// Define the type for the returned references
type RefItem = { title: string; url?: string | null; cite?: string | null };

/**
 * Weighted RRF (Reciprocal Rank Fusion) Algorithm
 * Purpose: Merges two lists of results with custom weighting.
 * Strategy: We give higher weight (weightB) to Keyword Search because exact term matches
 * (e.g., "541.07") are usually more accurate than semantic vector matches in law.
 */
function performRRF(listA: any[], listB: any[], k = 60, weightA = 1.0, weightB = 3.0) {
  const fusedScores = new Map<string, any>();

  // Process List A: Vector Search (Semantic) - Weight 1.0
  listA.forEach((doc, rank) => {
    const id = doc._id.toString();
    if (!fusedScores.has(id)) {
      fusedScores.set(id, { doc, score: 0 });
    }
    // RRF Formula with Weighting
    fusedScores.get(id).score += (1 / (k + rank + 1)) * weightA;
  });

  // Process List B: Keyword Search (Exact Match) - Weight 3.0 (Boosting this!)
  listB.forEach((doc, rank) => {
    const id = doc._id.toString();
    if (!fusedScores.has(id)) {
      fusedScores.set(id, { doc, score: 0 });
    }
    // RRF Formula with Weighting
    fusedScores.get(id).score += (1 / (k + rank + 1)) * weightB;
  });

  // Convert Map back to array and sort by score descending
  const sortedResults = Array.from(fusedScores.values())
    .sort((a, b) => b.score - a.score)
    .map((item) => item.doc);

  return sortedResults;
}

export async function retrieve(state: typeof InputStateAnnotation.State) {
  console.log(`🚀 Starting Hybrid Search for: "${state.question}"`);

  // --- Step 0: Query Expansion (The "Translator") ---
  // Uses a cheap model to convert natural language into better search terms.
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  });

  // Using plain objects for messages to avoid TypeScript version conflicts
  const expansionResponse = await llm.invoke([
    {
      role: "system",
      content: `You are a legal search query optimizer for Minnesota Statutes. 
      Your task is to convert the user's natural language question into a keyword-rich search query.
      
      Instructions:
      1. Replace slang with proper legal terminology (e.g., "weed" -> "cannabis", "caught" -> "arrested charged").
      2. Add relevant legal concepts or statute keywords (e.g., "custody" -> "custody parenting time dissolution").
      3. Do NOT answer the question. Only output the optimized search string.`
    },
    {
      role: "user",
      content: state.question
    }
  ]);

  const refinedQuery = expansionResponse.content as string;
  console.log(`🔀 Query Expanded: "${state.question}" -> "${refinedQuery}"`);
  // --- End Step 0 ---

  // 1. Connect to Database
  const mongoose = await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");
  
  const collection = db.collection("upgrade_laws"); 

  // 2. Generate Embedding for Vector Search (Use Original Question)
  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
  });
  const queryVector = await embeddings.embedQuery(state.question);

  // 3. Execute Parallel Searches: Vector + Keyword (with Boosting)
  const [vectorResults, keywordResults] = await Promise.all([
    // A. Vector Search (Semantic Understanding)
    collection.aggregate([
      {
        "$vectorSearch": {
          "index": "test_retrieval_vector_index", // Your Vector Index
          "path": "embedding",
          "queryVector": queryVector,
          "numCandidates": 100,
          "limit": 50 
        }
      },
      {
        "$project": {
          _id: 1,
          title: 1,
          content: 1,
          url: 1,
          id: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]).toArray(),

    // B. Keyword Search (Precision Match with Title Boosting)
    // Uses the REFINED query
    collection.aggregate([
      {
        "$search": {
          "index": "test_retrieval_atlas_search", // Your Text Index
          "compound": {
            "should": [
              {
                "text": {
                  "query": refinedQuery,
                  "path": "title", // 🎯 Search in Title
                  "score": { "boost": { "value": 5 } } // 🚀 Boost score by 5x if found in title
                }
              },
              {
                "text": {
                  "query": refinedQuery,
                  "path": ["content", "id"] // Normal search in content/id
                }
              }
            ]
          }
        }
      },
      { "$limit": 50 }, 
      {
        "$project": {
          _id: 1,
          title: 1,
          content: 1,
          url: 1,
          id: 1,
          score: { $meta: "searchScore" }
        }
      }
    ]).toArray()
  ]);

  console.log(`📊 Stats: Vector found ${vectorResults.length}, Keyword found ${keywordResults.length}`);

  // 4. Perform Weighted RRF Fusion
  const fusedResults = performRRF(vectorResults, keywordResults, 60, 1.0, 3.0);

  // 5. Slice Results (The Split Strategy)
  // Strategy: Feed the AI more context to be smart, but show the user fewer links to be clean.
  
  // AI Context Window: Top 15 documents (Accuracy priority)
  const contextDocs = fusedResults.slice(0, 15); 

  // User UI References: Top 3 documents (UX priority)
  const referenceDocs = fusedResults.slice(0, 3);

  // 6. Format Output
  // Create structured context for the AI
  const context = contextDocs.map((d: any) => {
    const title = d.title ?? "Unknown Title";
    const id = d.id ?? "Unknown ID";
    const content = d.content ?? "";
    return `--- DOCUMENT START ---\nID: ${id}\nTITLE: ${title}\nCONTENT:\n${content}\n--- DOCUMENT END ---`;
  }).join("\n\n");

  // Create clean references list for the User (using only the top 3)
  const references: RefItem[] = referenceDocs.map((d: any) => ({
    title: d.title ?? "Unknown statute",
    url: d.url ?? null,
    cite: d.id ?? null,
  }));

  console.log(`✅ AI Context Size: ${contextDocs.length} docs | User References Size: ${referenceDocs.length} docs`);
  
  if (contextDocs.length > 0) {
    console.log(`🥇 Top Result: ${contextDocs[0].id} - ${contextDocs[0].title}`);
  }

  return { context, references };
}