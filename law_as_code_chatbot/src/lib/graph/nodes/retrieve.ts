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
// Note: We removed SystemMessage and HumanMessage imports as we are using plain objects now

// Define the type for the returned references
type RefItem = { title: string; url?: string | null; cite?: string | null };

/**
 * RRF (Reciprocal Rank Fusion) Algorithm
 * Purpose: Merges two lists of results. If a document appears high in both lists,
 * its score is significantly boosted.
 */
function performRRF(listA: any[], listB: any[], k = 60) {
  const fusedScores = new Map<string, any>();

  // Process List A (Vector Search Results)
  listA.forEach((doc, rank) => {
    const id = doc._id.toString();
    if (!fusedScores.has(id)) {
      fusedScores.set(id, { doc, score: 0 });
    }
    // RRF Formula: 1 / (k + rank)
    fusedScores.get(id).score += 1 / (k + rank + 1);
  });

  // Process List B (Keyword Search Results)
  listB.forEach((doc, rank) => {
    const id = doc._id.toString();
    if (!fusedScores.has(id)) {
      fusedScores.set(id, { doc, score: 0 });
    }
    fusedScores.get(id).score += 1 / (k + rank + 1);
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
  // We use a fast/cheap LLM to convert the user's question into better search keywords.
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  });

  // FIX: Using plain objects instead of SystemMessage classes to avoid TypeScript errors
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
  
  // Confirmed collection name based on your previous screenshots
  const collection = db.collection("upgrade_laws"); 

  // 2. Generate Embedding for the ORIGINAL question
  // We use the original question for Vector Search to capture the user's original semantic intent.
  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
  });
  const queryVector = await embeddings.embedQuery(state.question);

  // 3. Execute Parallel Searches: Vector (Semantic) + Keyword (Exact Match)
  const [vectorResults, keywordResults] = await Promise.all([
    // A. Vector Search (Semantic Understanding)
    // Uses the original user question
    collection.aggregate([
      {
        "$vectorSearch": {
          "index": "test_retrieval_vector_index", // Your Vector Index Name
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

    // B. Keyword Search (Precision Match)
    // Uses the EXPANDED/REFINED query to catch specific legal terms
    collection.aggregate([
      {
        "$search": {
          "index": "test_retrieval_atlas_search", // Your Atlas Search Index Name
          "text": {
            "query": refinedQuery, // Using the LLM-optimized keywords here
            "path": ["content", "title", "id"] // Search in these fields
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

  // 4. Perform RRF Fusion
  // Merge the two lists, prioritizing documents that appear in both.
  const fusedResults = performRRF(vectorResults, keywordResults);

  // 5. Slice Top Results for Context
  // Increased to 25 to provide more context window to the LLM
  const finalDocs = fusedResults.slice(0, 25);

  // 6. Format Output
  const context = finalDocs.map((d: any) => d.content ?? "").join("\n\n");

  const references: RefItem[] = finalDocs.map((d: any) => ({
    title: d.title ?? "Unknown statute",
    url: d.url ?? null,
    cite: d.id ?? null,
  }));

  console.log(`✅ Final Hybrid Reranked Result Count: ${finalDocs.length}`);
  
  // Debug: Log the top result to verify relevance
  if (finalDocs.length > 0) {
    console.log(`🥇 Top Result: ${finalDocs[0].id} - ${finalDocs[0].title}`);
  }

  return { context, references };
}