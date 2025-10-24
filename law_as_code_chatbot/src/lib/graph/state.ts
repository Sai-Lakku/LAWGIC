// law_as_code_chatbot/src/lib/graph/state.ts
import {Document} from "@langchain/core/documents";
import {Annotation} from "@langchain/langgraph";

export const InputStateAnnotation = Annotation.Root({
    question: Annotation<string>,
});

export const StateAnnotation = Annotation.Root({
    question: Annotation<string>,
    context: Annotation<Document[]>,
    answer: Annotation<string>,
})

// export default InputStateAnnotation;
// export default StateAnnotation;