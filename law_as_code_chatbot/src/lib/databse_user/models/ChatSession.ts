// // law_as_code_chatbot/src/lib/databse_user/models/ChatSession.ts
// import mongoose from 'mongoose';

// const MessageSchema = new mongoose.Schema({
//   role: { type: String, required: true, enum: ['user', 'assistant', 'system'] },
//   content: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now }
// });

// const ChatSessionSchema = new mongoose.Schema(
//   {
//     userId: { type: String, required: true, index: true },
//     title: { type: String, default: 'New Chat' },
//     isPinned: { type: Boolean, default: false },
    
//     // added field for chat summary
//     summary: { type: String, default: "" }, 
    
//     messages: [MessageSchema],
//   },
//   { timestamps: true }
// );

// export const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema);


// law_as_code_chatbot/src/lib/databse_user/models/ChatSession.ts
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  role: { 
    type: String, 
    required: true, 
    enum: ['user', 'assistant', 'system'] 
  },
  content: { 
    type: String, 
    required: true 
  },
  // createdAt will be handled by timestamps option below if needed, 
  // but keeping it here is fine for array subdocuments
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const ChatSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: 'New Chat' },
    isPinned: { type: Boolean, default: false },
    summary: { type: String, default: "" }, 
    messages: [MessageSchema],
  },
  { 
    timestamps: true // 🔥 关键修改：自动管理 createdAt 和 updatedAt，不再需要 pre('save') 钩子
  }
);

export const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema);