// law_as_code_chatbot/src/app/api/history/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/databse_user/db";
import { ChatSession } from "@/lib/databse_user/models/ChatSession";
import { authOptions } from "../../auth/[...nextauth]/route";

// 定义 Next.js 15 的 Props 类型 (params 是 Promise)
type RouteProps = {
  params: Promise<{ id: string }>;
};

// GET: Fetch a single chat session
export async function GET(req: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔥 关键修改：必须 await params
    const { id } = await params;

    await connectDB();

    const chat = await ChatSession.findOne({ 
      _id: id, 
      userId: session.user.email 
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error getting chat:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT: Add a message to an existing chat
export async function PUT(req: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔥 关键修改：必须 await params
    const { id } = await params;

    const { messages } = await req.json(); 
    await connectDB();

    const updatedChat = await ChatSession.findOneAndUpdate(
      { _id: id, userId: session.user.email },
      { 
        $push: { messages: { $each: messages } }, 
        $set: { updatedAt: new Date() }           
      },
      { new: true }
    );

    if (!updatedChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: Handle Rename and Pin
export async function PATCH(req: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { title, isPinned } = await req.json(); // Accept title OR isPinned
    
    await connectDB();

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (isPinned !== undefined) updateData.isPinned = isPinned;

    const updatedChat = await ChatSession.findOneAndUpdate(
      { _id: id, userId: session.user.email },
      { $set: updateData },
      { new: true }
    );

    return NextResponse.json(updatedChat);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Delete a chat
export async function DELETE(req: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();

    await ChatSession.findOneAndDelete({ _id: id, userId: session.user.email });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}