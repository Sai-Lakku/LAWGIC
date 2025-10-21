// chat_layout.tsx
"use client";

import { Search, Book, Scale, MessageSquare, Plus, ChevronDown, ChevronRight, Filter, Copy, ThumbsUp, ThumbsDown, Send, RefreshCw } from 'lucide-react';
import { useEffect, useState } from "react";

// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import remarkGfm from "remark-gfm";



function MessageTimestamp({ timestamp }: { timestamp?: string }) {
  const [clientTime, setClientTime] = useState<string | null>(null);

  useEffect(() => {
    // Use the provided timestamp if it exists; otherwise generate once on mount
    setClientTime(timestamp || new Date().toLocaleTimeString());
  }, [timestamp]);

  return <>{clientTime}</>;
}

interface Message {
  id: number;
  type: 'assistant' | 'user';
  content: string;
  timestamp: string;
  confidence?: number;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  preview: string;
  date: string;
  messageCount: number;
  category: string;
}

interface LayoutProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (val: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
}

export default function Layout({
  messages,
  inputValue,
  setInputValue,
  onSendMessage,
  onKeyPress,
  isLoading,
}: LayoutProps) {
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);

  // Mock data for chat history
  const chatHistory: ChatHistoryItem[] = [
    {
      id: '1',
      title: 'Securities law compliance query',
      preview: 'What are the requirements for...',
      date: '1/15/2024',
      messageCount: 8,
      category: 'Securities Law'
    },
    {
      id: '2',
      title: 'Tax code interpretation',
      preview: 'Section 1031 like-kind exchanges...',
      date: '1/14/2024',
      messageCount: 12,
      category: 'Tax Law'
    },
    {
      id: '3',
      title: 'Civil rights violation assessment',
      preview: 'Employment discrimination under...',
      date: '1/14/2024',
      messageCount: 6,
      category: 'Civil Rights'
    },
    {
      id: '4',
      title: 'Contract law analysis',
      preview: 'Breach of contract remedies...',
      date: '1/13/2024',
      messageCount: 15,
      category: 'Contract Law'
    },
    {
      id: '5',
      title: 'Criminal procedure question',
      preview: 'Fourth Amendment search and...',
      date: '1/12/2024',
      messageCount: 9,
      category: 'Criminal Law'
    }
  ];

  const lawCategories = [
    'Securities Law',
    'Tax Law', 
    'Civil Rights',
    'Contract Law',
    'Criminal Law'
  ];

  const recentStatutes = [
    'Securities Exchange Act',
    'Internal Revenue Code',
    'Civil Rights Act'
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className={`${leftSidebarExpanded ? 'w-80' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-blue-600" />
            {leftSidebarExpanded && <span className="font-semibold text-gray-900">Statute Database</span>}
          </div>
        </div>

        {leftSidebarExpanded && (
          <>
            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search statutes..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Quick Categories */}
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {lawCategories.map((category) => (
                  <button
                    key={category}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Section */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4">
                <button
                  onClick={() => setRecentExpanded(!recentExpanded)}
                  className="flex items-center gap-2 w-full py-2 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  {recentExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Recent
                </button>
                {recentExpanded && (
                  <div className="ml-6 space-y-2">
                    {recentStatutes.map((statute) => (
                      <button
                        key={statute}
                        className="block w-full text-left py-1 px-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        {statute}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Categories Section */}
              <div className="px-4 mt-4">
                <button
                  onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                  className="flex items-center gap-2 w-full py-2 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  {categoriesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Filter className="w-4 h-4" />
                  Categories
                </button>
                {categoriesExpanded && (
                  <div className="ml-6 space-y-2">
                    {lawCategories.map((category) => (
                      <button
                        key={category}
                        className="block w-full text-left py-1 px-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Legal AI Assistant</h1>
                <p className="text-sm text-gray-600">Ask questions about statutes, regulations, and legal precedents</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Live Session
              </span>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-4xl mx-auto p-6">
            {messages && messages.length > 0 ? (
              messages.map((msg) => (
                <div key={msg.id} className="mb-6">
                  {msg.type === 'assistant' ? (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Scale className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        {/* <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-gray-200">
                          <div className="text-gray-900 leading-relaxed">{msg.content}</div>
                          {msg.confidence && (
                            <div className="mt-3 text-xs text-gray-500">
                              Confidence: {msg.confidence}%
                            </div>
                          )}
                        </div> */}
                        <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-gray-200">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            className="prose prose-sm max-w-none text-gray-900 leading-relaxed"
                          >
                            {msg.content}
                          </ReactMarkdown>
                          {msg.confidence && (
                            <div className="mt-3 text-xs text-gray-500">
                              Confidence: {msg.confidence}%
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">
                            <MessageTimestamp timestamp={msg.timestamp} />
                          </span>
                          <div className="flex items-center gap-1">
                            <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                              <Copy className="w-3 h-3" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-green-600 rounded">
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-red-600 rounded">
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 justify-end">
                      <div className="flex-1 max-w-2xl">
                        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm p-4">
                          <div className="leading-relaxed">{msg.content}</div>
                        </div>
                        <div className="text-right mt-2">
                          <span className="text-xs text-gray-500">{msg.timestamp}</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Legal AI Assistant</h3>
                <p className="text-gray-600 mb-6">I can help you with questions about statutes, regulations, and legal precedents. What would you like to know?</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Confidence: 95%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={onKeyPress}
                  placeholder="Ask a legal question... (e.g., 'What are the requirements for insider trading disclosure?')"
                  className="w-full p-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-500"
                  rows={2}
                />
                <button
                  onClick={onSendMessage}
                  disabled={isLoading || !inputValue || !inputValue.trim()}
                  className="absolute right-3 bottom-3 p-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              This AI assistant provides legal information for research purposes only and should not be considered legal advice.
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Chat History</span>
            </div>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Recent Conversations */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Recent Conversations
            </h3>
            <div className="space-y-3">
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{chat.title}</h4>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{chat.preview}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{chat.date}</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{chat.messageCount}</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{chat.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}