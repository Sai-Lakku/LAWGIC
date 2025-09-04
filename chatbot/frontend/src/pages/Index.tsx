import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StatuteSidebar } from "@/components/StatuteSidebar";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { Scale, PanelLeft, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background">
        {leftSidebarOpen && <StatuteSidebar />}
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className="h-8 w-8 p-0"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Scale className="h-6 w-6 text-legal-blue" />
                <span className="font-semibold text-lg">Law as Code</span>
              </div>
            </div>
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                className="h-8 w-8 p-0"
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Main Chat Interface */}
          <ChatInterface />
        </div>
        
        {rightSidebarOpen && <ChatHistorySidebar />}
      </div>
    </SidebarProvider>
  );
};

export default Index;
