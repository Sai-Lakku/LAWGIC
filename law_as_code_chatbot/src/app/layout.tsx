// law_as_code_chatbot/src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers"; 

export const metadata: Metadata = {
  title: "Law as Code Chatbot",
  description: "An AI assistant for statutes and legal analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Add suppressHydrationWarning to ignore browser extension attributes */}
      <body suppressHydrationWarning={true}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}




// interface Message {
//   id: number;
//   type: "assistant" | "user";
//   content: string;
//   timestamp: string;
//   confidence?: number;
// }

// interface ChatLayoutProps {
//   messages: Message[];
//   inputValue: string;
//   setInputValue: (value: string) => void;
//   onSendMessage: () => void;
//   onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
//   isLoading: boolean;
// }

// export default function ChatLayout({
//   messages,
//   inputValue,
//   setInputValue,
//   onSendMessage,
//   onKeyPress,
//   isLoading,
// }: ChatLayoutProps) {
//   return (
//     <div style={{ padding: "20px" }}>
//       <h1>💬 Legal AI Assistant</h1>

//       <div
//         style={{
//           border: "1px solid #ccc",
//           height: "300px",
//           overflowY: "auto",
//           marginBottom: "10px",
//           padding: "10px",
//         }}
//       >
//         {messages && messages.length > 0 ? (
//           messages.map((msg) => (
//             <p key={msg.id}>
//               <b>{msg.type}:</b> {msg.content}
//             </p>
//           ))
//         ) : (
//           <p>Start the conversation!</p>
//         )}
//         {isLoading && <p>⏳ Thinking...</p>}
//       </div>

//       <textarea
//         value={inputValue}
//         onChange={(e) => setInputValue(e.target.value)}
//         onKeyDown={onKeyPress}
//         placeholder="Type your legal question..."
//         rows={3}
//         style={{ width: "100%", marginBottom: "10px" }}
//       />
//       <button onClick={onSendMessage}>Send</button>
//     </div>
//   );
// }