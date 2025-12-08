// // law_as_code_chatbot/src/lib/graph/nodes/generate.ts
// import { InputStateAnnotation } from "../state";
// import { StateAnnotation } from "../state";
// import { llm } from "../../llm/model";
// import { ragPrompt } from "../../llm/prompts";
// import { streamText } from "ai";
// import { openai } from "@ai-sdk/openai";

// // // non-streaming version
// // export async function generate(state: typeof StateAnnotation.State) {
// //   const docsContent = (state.context ?? []).map(d => d.pageContent).join("\n");
// //   const messages = await ragPrompt.invoke({
// //     question: state.question,
// //     context: docsContent,
// //   });
// //   const response = await llm.invoke(messages);
// //   return { answer: String(response.content ?? "") };
// // }

// export async function generate(state: typeof StateAnnotation.State) {
//   const contextWithRefs = (state.context ?? []).map((d, i) => {
//   const ref = `[${i + 1}] ${d.metadata.title} (${d.metadata.url})`;
//   return `${ref}\n${d.pageContent}`;
// }).join("\n\n");
//   const references = (state.context ?? []).map(d => ({
//   title: d.metadata.title,
//   url: d.metadata.url,
//   id: d.metadata.id,
// }));
//   const messages = await ragPrompt.invoke({
//     question: state.question,
//     context: contextWithRefs,
//     references,
//   });
//   const response = await llm.invoke(messages.toChatMessages() as any);

//   return {
//     answer: String(response.content ?? ""),
//     references
//   };
// }


// // // streaming version
// // export async function* generateStream(state: {
// //   question: string;
// //   context: Array<{ pageContent: string}>;
// // }) {
// //   const docsContent = (state.context ?? []).map(d => d.pageContent).join("\n");
// //   const messages = await ragPrompt.invoke({
// //     question: state.question,
// //     context: docsContent,
// //   });
// //   const prompt = String(await ragPrompt.invoke({
// //   question: state.question,
// //   context: docsContent,
// // }));
// //   const {textStream} = streamText({
// //     model: openai("gpt-4o"),
// //     prompt
// // });
// //   for await (const textPart of textStream) {
// //     yield textPart;
// //   }
// // }

// // streaming version
// export async function* generateStream({
//   question,
//   context,
//   references,
// }: {
//   question: string;
//   context: string;
//   references?: Array<{ title: string; url?: string | null }>;
// }) {
//   // Build a context section that includes references visibly numbered
//   const contextWithRefs = context + "\n\nReferences:\n" + 
//     (references?.map((r, i) => `[${i + 1}] ${r.title} (${r.url})`).join("\n") ?? "");
//   // const contextWithRefs = (state.context ?? [])
//   // .map((d, i) => `[${i + 1}] ${d.metadata.title} (${d.metadata.url})\n${d.pageContent}`)
//   // .join("\n\n");

//   const messages = await ragPrompt.invoke({
//     question,
//     // context
//     context: contextWithRefs,
//   });
//   const prompt = String(messages)

//   // Stream from OpenAI
//   const { textStream } = streamText({
//     model: openai("gpt-4o"),
//     prompt,
//   });

//   // Yield tokens as they arrive
//   for await (const textPart of textStream) {
//     yield textPart;
//   }
// }



// law_as_code_chatbot/src/lib/graph/nodes/generate.ts
import { StateAnnotation } from "../state";
import { llm } from "../../llm/model";
import { ragPrompt } from "../../llm/prompts";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// 引入数据库和 Auth
import { getServerSession } from "next-auth";
import { authOptions } from "../../../app/api/auth/[...nextauth]/route";
import connectDB from "../../databse_user/db";
import { User } from "../../databse_user/user";

// --- Helper: 获取当前用户的画像 ---
async function getUserPersona() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return "A general user interested in Minnesota law."; 
    }
    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    return user?.legalPersona || "A new user interested in Minnesota law.";
  } catch (error) {
    console.error("Failed to fetch user persona:", error);
    return "A general user interested in Minnesota law.";
  }
}

// --- Non-streaming version ---
export async function generate(state: typeof StateAnnotation.State) {
  const userProfile = await getUserPersona();
  console.log(`👤 Using Persona: "${userProfile}"`);

  // 确保 context 是字符串
  const contextContent = Array.isArray(state.context)
    ? state.context.map((d: any) => d.pageContent).join("\n\n")
    : (state.context as string);

  const promptValue = await ragPrompt.invoke({
    question: state.question,
    context: contextContent,
    user_profile: userProfile,
  });

  // 🔥 修复点 1: 必须调用 .toChatMessages() 才能传给 llm.invoke
  const response = await llm.invoke(promptValue.toChatMessages());

  return {
    answer: String(response.content ?? ""),
    // 🔥 修复点 2: 使用 (state as any) 绕过类型检查，因为 state 定义里可能漏了 references
    references: (state as any).references 
  };
}

// --- Streaming version ---
export async function* generateStream({
  question,
  context,
  references,
}: {
  question: string;
  context: string;
  references?: Array<{ title: string; url?: string | null }>;
}) {
  const userProfile = await getUserPersona();
  
  // 准备 Prompt
  const promptValue = await ragPrompt.invoke({
    question,
    context: context, 
    user_profile: userProfile,
  });

  // 把 LangChain 的 messages 转换成 Vercel AI SDK 能懂的格式 (String 比较通用)
  // 这里我们使用 .toString() 获取简单的文本表示，或者 .format()
  // 注意：如果 ragPrompt 是 ChatPromptTemplate，直接 toString 可能得到对象字符串
  // 更稳妥的方法是再次 invoke 并转 string，或者手动拼接。
  // 为了简单起见，且确保 Vercel SDK 正常工作，我们这里直接构造 prompt string
  const messages = await promptValue.toChatMessages();
  
  // 将 system message 和 human message 拼成一个大字符串给 streamText (兼容性最好)
  const finalPrompt = messages.map(m => `${m._getType().toUpperCase()}: ${m.content}`).join("\n\n");

  const { textStream } = streamText({
    model: openai("gpt-4o"), 
    prompt: finalPrompt,   
  });

  for await (const textPart of textStream) {
    yield textPart;
  }
}