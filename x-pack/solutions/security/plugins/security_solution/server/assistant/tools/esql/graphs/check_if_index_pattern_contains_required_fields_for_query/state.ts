/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
