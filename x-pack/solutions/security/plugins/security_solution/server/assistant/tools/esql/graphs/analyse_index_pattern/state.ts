import { FieldDescriptor } from '@kbn/data-views-plugin/server';
import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

export const AnalyzeIndexPatternAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    input: Annotation<{ question: string, indexPattern: string } | undefined>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => undefined,
    }),
    fieldDescriptors: Annotation<FieldDescriptor[] | undefined>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => undefined,
    }),
    output: Annotation<{containsRequiredFieldsForQuery: boolean, context: string} | undefined>({
        reducer: (currentValue, newValue) => newValue ?? currentValue,
        default: () => undefined,
    })
});
