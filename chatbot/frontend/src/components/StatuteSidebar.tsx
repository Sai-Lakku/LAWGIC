import { useState } from "react";
import { Search, BookOpen, Calendar, Hash, ChevronDown, ChevronRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Mock statute data
const statutes = [
  {
    id: "USC-Title-15-Ch-2B",
    title: "Securities Exchange Act",
    year: 1934,
    section: "15 USC § 78j(b)",
    category: "Securities Law",
    lastUpdated: "2023-12-15"
  },
  {
    id: "USC-Title-26-Ch-1",
    title: "Internal Revenue Code",
    year: 1986,
    section: "26 USC § 1",
    category: "Tax Law",
    lastUpdated: "2024-01-10"
  },
  {
    id: "USC-Title-42-Ch-21",
    title: "Civil Rights Act",
    year: 1964,
    section: "42 USC § 2000e",
    category: "Civil Rights",
    lastUpdated: "2023-11-20"
  }
];

export function StatuteSidebar() {
  const { state } = useSidebar();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["recent"]));

  const filteredStatutes = statutes.filter(statute => {
    const matchesSearch = statute.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         statute.section.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar side="left" className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-legal-blue" />
            <h2 className="font-semibold text-foreground">Statute Database</h2>
          </div>
        )}
        
        {!isCollapsed && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search statutes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <Collapsible 
          open={expandedGroups.has("recent")}
          onOpenChange={() => toggleGroup("recent")}
        >
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {!isCollapsed && "Recent Statutes"}
                </span>
                {!isCollapsed && (
                  expandedGroups.has("recent") ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredStatutes.map((statute) => (
                    <SidebarMenuItem key={statute.id}>
                      <SidebarMenuButton 
                        className="flex flex-col items-start p-3 hover:bg-accent"
                        tooltip={isCollapsed ? statute.title : undefined}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Hash className="h-4 w-4 text-legal-blue flex-shrink-0" />
                          {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{statute.title}</div>
                              <div className="text-xs text-muted-foreground">{statute.section}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {statute.year}
                                </Badge>
                                <span className="text-xs text-legal-neutral">{statute.category}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
    </Sidebar>
  );
}