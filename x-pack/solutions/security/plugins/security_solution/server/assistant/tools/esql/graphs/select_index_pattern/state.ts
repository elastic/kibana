/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

export const SelectIndexPatternAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  input: Annotation<{ question: string; indexPattern?: string } | undefined>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => undefined,
  }),
  indexPatterns: Annotation<string[]>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => [],
  }),
  shortlistedIndexPatterns: Annotation<string[]>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => [],
  }),
  indexPatternAnalysis: Annotation<
    Record<string, { containsRequiredData: boolean; indexPattern: string; context: string }>
  >({
    reducer: (currentValue, newValue) => ({ ...currentValue, ...newValue }),
    default: () => ({}),
  }),
  selectedIndexPattern: Annotation<string | undefined | null>({
    reducer: (currentValue, newValue) => (newValue === undefined ? currentValue : newValue),
    default: () => undefined,
  }),
});
