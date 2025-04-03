import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

export const IdentityIndexAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    input: Annotation<string>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => "",
    }),
    objectiveSummary: Annotation<string>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => "",
    }),
    availableIndices: Annotation<string[]>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => [],
    }),
    indexPatterns: Annotation<string[]>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => [],
    }),
    shortlistedIndexPatterns: Annotation<string[]>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => [],
    }),
    shortlistedIndexPatternAnalysis: Annotation<Record<string, {analysis: string, containsRequiredData: boolean, indexPattern: string}>>({
        reducer: (currentValue, newValue) => ({...currentValue, ...newValue}),
        default: () => ({}),
    }),
    selectedIndexPattern: Annotation<string | undefined>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => undefined,
    }),
});
