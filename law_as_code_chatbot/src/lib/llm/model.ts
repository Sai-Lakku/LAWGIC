// law_as_code_chatbot/src/lib/llm/model.ts
import {ChatOpenAI} from "@langchain/openai";
import {OpenAIEmbeddings} from "@langchain/openai";

export const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0
});

export const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small"
});