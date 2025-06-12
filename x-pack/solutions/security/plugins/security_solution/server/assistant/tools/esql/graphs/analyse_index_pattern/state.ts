/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

export const AnalyzeIndexPatternAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  input: Annotation<{ question: string; indexPattern: string } | undefined>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => undefined,
  }),
  fieldDescriptors: Annotation<FieldDescriptor[] | undefined>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => undefined,
  }),
  output: Annotation<{ containsRequiredFieldsForQuery: boolean; context: string } | undefined>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => undefined,
  }),
});
