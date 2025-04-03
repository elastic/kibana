import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

export const CheckIfIndexContainsRequiredFieldsAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    indexPattern: Annotation<string>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => '',
    }),
    containsRequiredData: Annotation<boolean>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => false,
    }),
    analysis: Annotation<string>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => '',
    }),
});