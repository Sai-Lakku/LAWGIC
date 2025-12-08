"use client";
// law_as_code_chatbot/src/app/chat/[id]/page.tsx

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Layout from "../../chat_layout"; // 引入你已经写好的 Layout

export default function ChatPage() {
  const params = useParams();
  const id = params?.id as string; // 获取 URL 里的 ID
  const { data: session } = useSession();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 1. 加载历史记录 (Load History)
  useEffect(() => {
    if (id && session?.user) {
      // 刚进入页面时，先显示 loading 状态也可以，或者只是在后台加载
      fetch(`/api/history/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Chat not found");
          return res.json();
        })
        .then((data) => {
          // 把数据库的消息格式转换为 UI 需要的格式
          if (data.messages && Array.isArray(data.messages)) {
            const formattedMessages = data.messages.map((m: any, index: number) => ({
              id: index, // 使用索引或 m._id 作为 key
              type: m.role, // 'user' or 'assistant'
              content: m.content,
              timestamp: new Date(m.createdAt).toLocaleTimeString(),
              confidence: m.role === 'assistant' ? 95 : undefined // 模拟 confidence
            }));
            setMessages(formattedMessages);
          }
        })
        .catch((err) => console.error("Error loading chat:", err));
    }
  }, [id, session]);

  // 2. 发送消息逻辑 (Send Message in Existing Chat)
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // 立即显示用户消息 (Optimistic UI)
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
      // A. 把用户消息存入数据库 (PUT)
      await fetch(`/api/history/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }]
        })
      });

      // B. 请求 AI 回答 (Stream)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });

      if (!res.body) throw new Error("No response stream.");

      // 准备 AI 消息框
      const assistantId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        { 
          id: assistantId, 
          type: "assistant", 
          content: "", 
          timestamp: new Date().toLocaleTimeString() 
        },
      ]);

      // 读取流
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

      // C. 把 AI 的完整回答存入数据库 (PUT)
      await fetch(`/api/history/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "assistant", content: fullResponse }]
        })
      });

    } catch (err) {
      console.error(err);
      // 可以在这里添加错误提示消息
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
      onKeyPress={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault(); // 防止回车换行
          handleSendMessage();
        }
      }}
      isLoading={isLoading}
    />
  );
}