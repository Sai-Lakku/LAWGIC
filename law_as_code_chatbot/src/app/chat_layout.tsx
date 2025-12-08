"use client";
// law_as_code_chatbot/src/app/chat_layout.tsx

import { 
  MessageSquare, Plus, Copy, ThumbsUp, ThumbsDown, 
  Send, RefreshCw, Loader2, Calendar, Menu, X, MoreHorizontal, Pin, Trash2, Edit2, Scale 
} from 'lucide-react';
import { useEffect, useState } from "react";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

import { AuthSidebarItem } from "@/components/AuthSidebarItem";

// --- Components ---

function MessageTimestamp({ timestamp }: { timestamp?: string }) {
  const [clientTime, setClientTime] = useState<string | null>(null);

  useEffect(() => {
    setClientTime(timestamp || new Date().toLocaleTimeString());
  }, [timestamp]);

  return <>{clientTime}</>;
}

// --- Interfaces ---

interface Message {
  id: number;
  type: 'assistant' | 'user';
  content: string;
  timestamp: string;
  confidence?: number;
}

interface ChatSessionItem {
  _id: string;
  title: string;
  updatedAt: string;
  isPinned?: boolean;
}

interface LayoutProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (val: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
}

// --- Main Component ---

export default function Layout({
  messages,
  inputValue,
  setInputValue,
  onSendMessage,
  onKeyPress,
  isLoading,
}: LayoutProps) {
  const { data: session } = useSession();
  const params = useParams();
  const currentChatId = params?.id as string;
  const router = useRouter();

  // State
  const [history, setHistory] = useState<ChatSessionItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Menu & Edit State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If clicking inside a menu or a button, don't close immediately (handled by button logic)
      if ((event.target as HTMLElement).closest('.chat-menu-trigger')) return;
      setActiveMenuId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch History
  useEffect(() => {
    if (session?.user) {
      setIsHistoryLoading(true);
      fetch("/api/history")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to fetch history");
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setHistory(data);
          }
        })
        .catch((err) => console.error("Error loading history:", err))
        .finally(() => setIsHistoryLoading(false));
    }
  }, [session, currentChatId]);

  // --- Helper: Trigger Analysis (Fire and Forget) ---
  const triggerAnalysis = async (chatId: string) => {
    // We use a non-blocking fetch call to analyze the chat when the user leaves it.
    // This updates the chat summary and user persona in the background.
    try {
      fetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ chatId }),
        headers: { "Content-Type": "application/json" }
      });
      // We don't await response because we don't want to block navigation
    } catch (e) {
      console.error("Background analysis failed", e);
    }
  };

  // --- Actions ---

  // Handle Card Click (Navigation)
  const handleChatClick = (chatId: string) => {
    if (editingChatId === chatId) return; // Don't navigate if editing
    
    // 🔥 Trigger analysis for the OLD chat before leaving
    if (currentChatId && currentChatId !== chatId) {
      triggerAnalysis(currentChatId);
    }

    router.push(`/chat/${chatId}`);
    setIsMobileMenuOpen(false);
  };

  // Handle New Chat Click
  const handleNewChatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    
    // 🔥 Trigger analysis for the OLD chat before leaving
    if (currentChatId) {
      triggerAnalysis(currentChatId);
    }
    
    router.push("/");
  };

  const handlePin = async (e: React.MouseEvent, chat: ChatSessionItem) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling
    
    // Optimistic Update
    const newPinnedStatus = !chat.isPinned;
    setHistory(prev => 
      prev.map(c => c._id === chat._id ? { ...c, isPinned: newPinnedStatus } : c)
          .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
    setActiveMenuId(null);

    await fetch(`/api/history/${chat._id}`, {
      method: "PATCH",
      body: JSON.stringify({ isPinned: newPinnedStatus })
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if(!confirm("Are you sure you want to delete this chat?")) return;

    setHistory(prev => prev.filter(c => c._id !== id));
    if (currentChatId === id) router.push("/"); 

    await fetch(`/api/history/${id}`, { method: "DELETE" });
  };

  const startRename = (e: React.MouseEvent, chat: ChatSessionItem) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChatId(chat._id);
    setEditTitle(chat.title);
    setActiveMenuId(null);
  };

  const saveRename = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setHistory(prev => prev.map(c => c._id === id ? { ...c, title: editTitle } : c));
    setEditingChatId(null);
    
    await fetch(`/api/history/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: editTitle })
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:relative z-50 w-80 h-full bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out flex-shrink-0
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Chat History</span>
            </div>
            <div className="flex gap-1">
              <Link 
                href="/" 
                onClick={handleNewChatClick} // Updated handler
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </Link>
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="md:hidden p-1.5 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200">
          <Link 
            href="/"
            onClick={handleNewChatClick} // Updated handler
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            New Chat
          </Link>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 pb-24"> 
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Recent Conversations
            </h3>
            
            <div className="space-y-2">
              {isHistoryLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8 italic">
                  No history yet.<br/>Start a new chat!
                </div>
              ) : (
                history.map((chat) => (
                  <div key={chat._id} className="relative">
                    {editingChatId === chat._id ? (
                      // --- Editing Mode ---
                      <form 
                        onSubmit={(e) => saveRename(e, chat._id)} 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 border border-blue-500 rounded-lg bg-blue-50"
                      >
                        <input 
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => setEditingChatId(null)}
                          className="w-full text-sm border-none bg-transparent focus:ring-0 p-0 text-gray-900"
                        />
                      </form>
                    ) : (
                      // --- Normal Mode (Flexbox Layout) ---
                      <div 
                        className={`
                          flex items-center justify-between group border rounded-lg transition-all
                          ${
                            currentChatId === chat._id
                              ? "border-blue-500 bg-blue-50 shadow-sm"
                              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                          }
                        `}
                      >
                        {/* 1. Left Side: Clickable Area for Navigation */}
                        <div 
                          onClick={() => handleChatClick(chat._id)}
                          className="flex-1 p-3 min-w-0 cursor-pointer"
                        >
                          <h4 className={`text-sm font-medium line-clamp-1 ${
                            currentChatId === chat._id ? "text-blue-800" : "text-gray-900"
                          }`}>
                            {chat.isPinned && <Pin size={12} className="inline mr-1.5 fill-current text-blue-600 rotate-45" />}
                            {chat.title}
                          </h4>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(chat.updatedAt)}
                          </div>
                        </div>

                        {/* 2. Right Side: Menu Button (Completely Separate) */}
                        <div className="pr-2 relative">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === chat._id ? null : chat._id);
                            }}
                            className={`
                              chat-menu-trigger p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200/80 
                              transition-opacity
                              ${activeMenuId === chat._id ? 'opacity-100 bg-gray-200' : 'opacity-0 group-hover:opacity-100'}
                            `}
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {/* 3. The Dropdown Menu */}
                          {activeMenuId === chat._id && (
                            <div 
                              className="absolute right-0 top-8 w-36 bg-white border border-gray-200 shadow-xl rounded-md z-50 overflow-hidden ring-1 ring-black ring-opacity-5"
                              onClick={(e) => e.stopPropagation()} 
                            >
                              <button 
                                onClick={(e) => handlePin(e, chat)} 
                                className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Pin size={12} /> {chat.isPinned ? "Unpin Chat" : "Pin Chat"}
                              </button>
                              <button 
                                onClick={(e) => startRename(e, chat)} 
                                className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 size={12} /> Rename
                              </button>
                              <button 
                                onClick={(e) => handleDelete(e, chat._id)} 
                                className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 mt-auto">
           <AuthSidebarItem />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="md:hidden text-gray-600 p-1"
              >
                <Menu size={24} />
              </button>
              
              <div className="flex items-center gap-2">
                <Scale className="w-6 h-6 text-blue-600 hidden md:block" />
                <div>
                  <h1 className="text-lg md:text-xl font-semibold text-gray-900">Legal AI Assistant</h1>
                  <p className="text-xs md:text-sm text-gray-600 hidden md:block">Ask questions about statutes, regulations, and legal precedents</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Live Session
              </span>
              <button 
                onClick={() => router.refresh()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 scroll-smooth pb-32">
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            {messages && messages.length > 0 ? (
              messages.map((msg) => (
                <div key={msg.id} className="mb-6">
                  {msg.type === 'assistant' ? (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1 hidden md:flex">
                        <Scale className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-2xl rounded-tl-sm p-5 shadow-sm border border-gray-200">
                          
                          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none text-gray-900 leading-relaxed break-words" components={{
                          a: ({ node, ...props }: any) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 font-medium" />,
                          p: ({ node, ...props }: any) => <p {...props} className="mb-3 last:mb-0" />,
                          ul: ({ node, ...props }: any) => <ul {...props} className="list-disc pl-5 mb-3 space-y-1" />,
                          ol: ({ node, ordered, ...props }: any) => <ol {...props} className="list-decimal pl-5 mb-3 space-y-1" />,
                        }}>{msg.content}</ReactMarkdown>

                          {msg.confidence && (
                            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 font-medium">
                              Confidence Score: {msg.confidence}%
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 ml-1">
                          <span className="text-xs text-gray-400">
                            <MessageTimestamp timestamp={msg.timestamp} />
                          </span>
                          <div className="flex items-center gap-1">
                            <button className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors" title="Copy">
                              <Copy className="w-3 h-3" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors" title="Helpful">
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors" title="Not Helpful">
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 justify-end">
                      <div className="flex-1 max-w-2xl flex flex-col items-end">
                        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm p-4 shadow-sm">
                          <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                        </div>
                        <div className="text-right mt-2 mr-1">
                          <span className="text-xs text-gray-400">{msg.timestamp}</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1 hidden md:flex">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-0 animate-fadeIn" style={{ animationFillMode: 'forwards' }}>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Scale className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Legal AI Assistant</h3>
                <p className="text-gray-500 mb-8 text-center max-w-md">
                  I can help you with questions about statutes, regulations, and legal precedents. Start by asking a question below.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  System Online: 95% Confidence
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0 z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={onKeyPress}
                placeholder="Ask a legal question... (e.g., 'What are the requirements for insider trading disclosure?')"
                className="w-full p-4 pr-14 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 shadow-sm transition-shadow min-h-[60px] max-h-[200px]"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={onSendMessage}
                disabled={isLoading || !inputValue || !inputValue.trim()}
                className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-all shadow-sm active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-3 text-center">
              This AI assistant provides legal information for research purposes only and should not be considered professional legal advice.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}