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
import connectDB from "../../databse_user/db"; // 导入你的数据库连接
import { OpenAIEmbeddings } from "@langchain/openai";

// 定义返回引用的类型
type RefItem = { title: string; url?: string | null; cite?: string | null };

/**
 * RRF (Reciprocal Rank Fusion) 融合算法
 * 作用：合并两个列表，如果一个文档在两边都排名靠前，它的分数会暴涨。
 */
function performRRF(listA: any[], listB: any[], k = 60) {
  const fusedScores = new Map<string, any>();

  // 处理列表 A (向量搜索结果)
  listA.forEach((doc, rank) => {
    const id = doc._id.toString();
    if (!fusedScores.has(id)) {
      fusedScores.set(id, { doc, score: 0 });
    }
    // RRF 公式: 1 / (k + rank)
    fusedScores.get(id).score += 1 / (k + rank + 1);
  });

  // 处理列表 B (关键字搜索结果)
  listB.forEach((doc, rank) => {
    const id = doc._id.toString();
    if (!fusedScores.has(id)) {
      fusedScores.set(id, { doc, score: 0 });
    }
    fusedScores.get(id).score += 1 / (k + rank + 1);
  });

  // 将 Map 转回数组并按分数倒序排列
  const sortedResults = Array.from(fusedScores.values())
    .sort((a, b) => b.score - a.score)
    .map((item) => item.doc);

  return sortedResults;
}

export async function retrieve(state: typeof InputStateAnnotation.State) {
  console.log(`🚀 Starting Hybrid Search for: "${state.question}"`);
  
  // 1. 获取数据库连接
  const mongoose = await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");
  
  // ⚠️ 确认你的 Collection 名字是 "upgrade_laws" (根据你之前的截图)
  const collection = db.collection("upgrade_laws"); 

  // 2. 生成问题的 Embedding (用于向量搜索)
  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small", // 确保和你存入数据库时用的模型一致
  });
  const queryVector = await embeddings.embedQuery(state.question);

  // 3. 并行执行：向量搜索 + 关键字搜索
  const [vectorResults, keywordResults] = await Promise.all([
    // A. 向量搜索 (语义)
    collection.aggregate([
      {
        "$vectorSearch": {
          "index": "test_retrieval_vector_index", // 你的 Index 名字
          "path": "embedding",
          "queryVector": queryVector,
          "numCandidates": 100, // 也就是 k
          "limit": 50 // 取前 50 个用于融合
        }
      },
      {
        "$project": {
          _id: 1,
          title: 1,
          content: 1,
          url: 1,
          id: 1, // 这里的 id 是 statutes id (e.g. 514.08)
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]).toArray(),

    // B. 关键字搜索 (精确匹配 - 解决 Accuracy 低的核心)
    collection.aggregate([
      {
        "$search": {
          "index": "test_retrieval_atlas_index", // 必须确保 Index 配置里包含文本字段的 mapping
          "text": {
            "query": state.question,
            "path": ["content", "title", "id"] // 在这三个字段里搜关键词
          }
        }
      },
      { "$limit": 50 }, // 取前 50 个用于融合
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

  // 4. 执行 RRF 融合
  // 这会把两边的结果合并，取重合度最高的排在最前面
  const fusedResults = performRRF(vectorResults, keywordResults);

  // 5. 只取最终的前 10 个给 LLM
  const finalDocs = fusedResults.slice(0, 10);

  // 6. 格式化返回给 Graph (保持和你原有格式兼容)
  const context = finalDocs.map((d: any) => d.content ?? "").join("\n\n");

  const references: RefItem[] = finalDocs.map((d: any) => ({
    title: d.title ?? "Unknown statute",
    url: d.url ?? null,
    cite: d.id ?? null,
  }));

  console.log(`✅ Final Hybrid Reranked Result Count: ${finalDocs.length}`);
  
  // (可选) 打印第一名的标题，看看是不是我们要找的法条
  if (finalDocs.length > 0) {
    console.log(`🥇 Top Result: ${finalDocs[0].id} - ${finalDocs[0].title}`);
  }

  return { context, references };
}