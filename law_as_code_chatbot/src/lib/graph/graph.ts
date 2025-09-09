import {StateGraph} from "@langchain/langgraph";
import {StateAnnotation} from "./state.js";
import {retrieve} from "./nodes/retrieve.js";
import {generate} from "./nodes/generate.js";

export const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
  .compile();
