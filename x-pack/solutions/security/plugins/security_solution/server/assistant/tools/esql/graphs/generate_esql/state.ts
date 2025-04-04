/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { ValidateEsqlResult } from './nodes/validate_esql_in_last_message_node/utils';

export const GenerateEsqlAnnotation = Annotation.Root({
  input: Annotation<string>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => '',
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  objectiveSummary: Annotation<string>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => '',
  }),
  validateEsqlResults: Annotation<ValidateEsqlResult[]>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => [],
  }),
  maximumValidationAttempts: Annotation<number>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => 5,
  }),
  maximumEsqlGenerationAttempts: Annotation<number>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => 5,
  }),
  selectedIndexPattern: Annotation<string | undefined | null>({
    reducer: (currentValue, newValue) => newValue === undefined ? currentValue : newValue,
    default: () => undefined,
  }),
});
