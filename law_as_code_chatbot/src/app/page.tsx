"use client";
// page.tsx


import { useState } from "react";
import Layout from "./chat_layout";

export default function Page() {
  interface Message {
    id: number;
    type: "assistant" | "user";
    content: string;
    timestamp: string;
    confidence?: number;
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "assistant",
      content:
        "Hello! I'm your legal AI assistant. I can help you with questions about statutes, regulations, and legal precedents. What would you like to know?",
      confidence: 95,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: inputValue,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMessage]);

    const question = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });

      if (!res.body) {
        throw new Error("No response body (stream).");
      }

      const assistantId = userMessage.id + 1;
      setMessages(prev => [
        ...prev,
        {
          id: assistantId,
          type: "assistant",
          content: "",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });

        setMessages(prev =>
          prev.map(m => (m.id === assistantId ? { ...m, content: acc } : m))
        );
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (err) {
      console.error("stream fetch error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: messages.length + 2,
          type: "assistant",
          content: "⚠️ Streaming failed.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
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
      onKeyPress={e => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      }}
      isLoading={isLoading}
    />
  );
}