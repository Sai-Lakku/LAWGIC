import { useState } from "react";
import { MessageSquare, Clock, Trash2, Plus, Search, Archive } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Mock chat history data
const chatHistory = [
  {
    id: "1",
    title: "Securities law compliance query",
    preview: "What are the requirements for...",
    timestamp: "2024-01-15T10:30:00Z",
    messageCount: 8,
    category: "Securities Law"
  },
  {
    id: "2", 
    title: "Tax code interpretation",
    preview: "Section 1031 like-kind exchanges...",
    timestamp: "2024-01-14T15:45:00Z",
    messageCount: 12,
    category: "Tax Law"
  },
  {
    id: "3",
    title: "Civil rights violation assessment",
    preview: "Employment discrimination under...",
    timestamp: "2024-01-14T09:20:00Z",
    messageCount: 6,
    category: "Civil Rights"
  },
  {
    id: "4",
    title: "Contract law analysis",
    preview: "Breach of contract remedies...",
    timestamp: "2024-01-13T14:15:00Z",
    messageCount: 15,
    category: "Contract Law"
  },
  {
    id: "5",
    title: "Criminal procedure question",
    preview: "Fourth Amendment search and...",
    timestamp: "2024-01-12T11:30:00Z",
    messageCount: 9,
    category: "Criminal Law"
  }
];

export function ChatHistorySidebar() {
  const { state } = useSidebar();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>("1");

  const filteredChats = chatHistory.filter(chat =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.preview.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar side="right" className="border-l border-border">
      <SidebarHeader className="p-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-legal-blue" />
              <h2 className="font-semibold text-foreground">Chat History</h2>
            </div>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {!isCollapsed && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {!isCollapsed && "Recent Conversations"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredChats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    onClick={() => setSelectedChat(chat.id)}
                    className={`flex flex-col items-start p-3 h-auto hover:bg-accent ${
                      selectedChat === chat.id ? "bg-accent border-l-2 border-legal-blue" : ""
                    }`}
                    tooltip={isCollapsed ? chat.title : undefined}
                  >
                    {!isCollapsed ? (
                      <div className="w-full space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm line-clamp-2 text-left">
                            {chat.title}
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle delete
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 text-left">
                          {chat.preview}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {formatTimestamp(chat.timestamp)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {chat.messageCount}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {chat.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archived
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton className="text-muted-foreground">
                    <div className="text-sm">No archived conversations</div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}