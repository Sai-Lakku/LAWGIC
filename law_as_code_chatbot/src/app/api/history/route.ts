// law_as_code_chatbot/src/app/api/history/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/databse_user/db";
import { ChatSession } from "@/lib/databse_user/models/ChatSession";
import { authOptions } from "../auth/[...nextauth]/route";
import OpenAI from "openai"; // 引入 OpenAI

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET: ... (保持不变) ...
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const chats = await ChatSession.find({ userId: session.user.email })
      .select("_id title updatedAt isPinned") // 记得把 isPinned 也选出来
      .sort({ isPinned: -1, updatedAt: -1 }); // 先按置顶排序，再按时间排序

    return NextResponse.json(chats);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a new chat session with AI Summary Title
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { firstMessage } = await req.json();
    await connectDB();

    let title = "New Chat";

    // Call OpenAI to generate a concise title
    if (firstMessage) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini", // Use mini for speed and cost
          messages: [
            {
              role: "system",
              content: "Generate a concise title (3-6 words) for this chat based on the user's first message. Do not use quotes."
            },
            { role: "user", content: firstMessage }
          ],
          max_tokens: 15,
        });
        title = response.choices[0]?.message?.content?.trim() || title;
      } catch (err) {
        console.error("Failed to generate title:", err);
        // Fallback to truncation if AI fails
        title = firstMessage.slice(0, 30) + "...";
      }
    }

    const newChat = await ChatSession.create({
      userId: session.user.email,
      title: title,
      messages: [],
      isPinned: false // Initialize unpinned
    });

    return NextResponse.json(newChat);
  } catch (error) {
    console.error("Create chat error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}