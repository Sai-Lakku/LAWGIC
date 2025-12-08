// law_as_code_chatbot/src/app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/databse_user/db";
import { ChatSession } from "@/lib/databse_user/models/ChatSession";
import { User } from "@/lib/databse_user/user";
import { authOptions } from "../auth/[...nextauth]/route";
import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // 1. Authentication Check
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Request
    const { chatId } = await req.json();
    if (!chatId) {
      return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
    }

    await connectDB();

    // 3. Fetch the Chat Session
    const currentChat = await ChatSession.findOne({ 
      _id: chatId, 
      userId: session.user.email 
    });

    if (!currentChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Skip analysis if the conversation is too short (e.g., just "Hello")
    if (currentChat.messages.length < 2) {
      return NextResponse.json({ message: "Not enough messages to analyze" });
    }

    // --- TASK A: Generate Session Summary ---
    
    // Extract conversation text (limit to last 2000 chars to save tokens)
    const conversationText = currentChat.messages
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n")
      .slice(-2000); // Take the end of the conversation

    // AI Call 1: Summarize this specific chat
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use mini for cost efficiency
      messages: [
        {
          role: "system",
          content: "Summarize the legal topic and user intent of this conversation in one concise sentence (max 30 words)."
        },
        { role: "user", content: conversationText }
      ]
    });

    const newSummary = summaryResponse.choices[0]?.message?.content || "";
    
    // Save summary to the ChatSession document
    currentChat.summary = newSummary;
    await currentChat.save();


    // --- TASK B: Update User Legal Persona ---
    
    // Fetch the 5 most recent chat summaries for this user (including the one we just made)
    const recentChats = await ChatSession.find({ userId: session.user.email })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("summary");

    // Filter out empty summaries
    const recentSummaries = recentChats
      .map((c) => c.summary)
      .filter((s) => s && s.length > 0)
      .join("\n- ");

    if (recentSummaries.length > 0) {
      // AI Call 2: Profile the user based on history
      const personaResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at profiling legal clients. 
            Based on the following list of recent conversation summaries, create a "Legal Persona" for this user.
            Describe who they likely are (e.g., tenant, landlord, business owner, employee) and what their primary legal concerns are.
            Keep it under 50 words.`
          },
          { role: "user", content: `Recent topics:\n- ${recentSummaries}` }
        ]
      });

      const newPersona = personaResponse.choices[0]?.message?.content || "";

      // Save persona to the User document
      await User.findOneAndUpdate(
        { email: session.user.email },
        { legalPersona: newPersona }
      );
      
      console.log(`👤 Updated User Persona for ${session.user.email}: ${newPersona}`);
    }

    return NextResponse.json({ 
      success: true, 
      summary: newSummary 
    });

  } catch (error) {
    console.error("Analysis failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}