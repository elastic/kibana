import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export const EsqlSelfHealingAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    maximumValidationAttempts: Annotation<number>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => 10,
    }),
    maximumLLMCalls: Annotation<number>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => 30,
    }),
});