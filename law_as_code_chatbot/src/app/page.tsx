"use client";
// law_as_code_chatbot/src/app/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Layout from "./chat_layout";

export default function Page() {
  const router = useRouter();
  const { data: session } = useSession();

  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      type: "assistant",
      content: "Hello! I'm your legal AI assistant. What would you like to know?",
      confidence: 95,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // 1. UI: Optimistic update
    const userMsg = {
      id: Date.now(),
      type: "user",
      content: inputValue,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const question = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      // 2. Logic: If user is logged in, Create a NEW Session
      let chatId = null;
      if (session?.user) {
        const createRes = await fetch("/api/history", {
          method: "POST",
          body: JSON.stringify({ firstMessage: question }),
        });
        const newChat = await createRes.json();
        chatId = newChat._id;
        
        // Push initial user message to DB
        await fetch(`/api/history/${chatId}`, {
          method: "PUT",
          body: JSON.stringify({
            messages: [{ role: "user", content: question }]
          })
        });
      }

      // 3. Logic: Get Answer from AI
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });

      if (!res.body) throw new Error("No response stream.");

      // Prepare UI for Assistant Stream
      const assistantId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, type: "assistant", content: "", timestamp: new Date().toLocaleTimeString() },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fullResponse } : m))
        );
      }

      // 4. Logic: Save Assistant Response to DB
      if (chatId) {
        await fetch(`/api/history/${chatId}`, {
          method: "PUT",
          body: JSON.stringify({
            messages: [{ role: "assistant", content: fullResponse }]
          })
        });

        // Redirect to the new chat URL so subsequent messages append to this chat
        router.push(`/chat/${chatId}`);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout
      messages={messages}
      inputValue={inputValue}
      setInputValue={setInputValue}
      onSendMessage={handleSendMessage}
      onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
      isLoading={isLoading}
    />
  );
}