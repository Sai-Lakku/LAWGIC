// graph.ts
import {StateGraph} from "@langchain/langgraph";
import {StateAnnotation} from "./state";
import {retrieve} from "./nodes/retrieve";
import {generate} from "./nodes/generate";

export const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
  .compile();
