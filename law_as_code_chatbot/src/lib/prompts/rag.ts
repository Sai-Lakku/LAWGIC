import {ChatPromptTemplate} from "@langchain/core/prompts";

export const ragPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are a helpful AI Law assistant. Use the following pieces of context to answer the question at the end. 
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        Always answer in English.
        
        Context:
        {context}`
    ],
    [
        "human",
        "{question}"
    ]
]);