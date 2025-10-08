/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

export interface IndexResource {
  type: 'index' | 'alias' | 'data_stream';
  name: string;
  reason: string;
  relevanceScore?: number;
  hasRequiredFields?: boolean;
  isAccessible?: boolean;
}

export const EnhancedIndexExplorerAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  input: Annotation<
    { query: string; limit?: number; indexPattern?: string; question?: string } | undefined
  >({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => undefined,
  }),
  discoveredResources: Annotation<IndexResource[]>({
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
  selectedResources: Annotation<IndexResource[]>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => [],
  }),
  finalRecommendation: Annotation<
    | {
        primaryIndex: string;
        alternativeIndices: string[];
        reasoning: string;
      }
    | undefined
  >({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => undefined,
  }),
});
