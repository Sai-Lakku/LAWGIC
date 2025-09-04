"use client";

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

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: messages.length + 2,
        type: "assistant",
        content: `Thank you for your question about "${inputValue}". This is a simulated response. In a real implementation, this would connect to your backend.`,
        confidence: Math.floor(Math.random() * 20) + 80,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Layout
      messages={messages}
      inputValue={inputValue}
      setInputValue={setInputValue}
      onSendMessage={handleSendMessage}
      onKeyPress={handleKeyPress}
      isLoading={isLoading}
    />
  );
}
