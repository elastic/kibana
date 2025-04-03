/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { ValidateEsqlResult } from './nodes/validate_esql_in_last_message_node/utils';

export const EsqlSelfHealingAnnotation = Annotation.Root({
  input: Annotation<string>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => "",
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  objectiveSummary: Annotation<string>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => "",
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
  indexPatternIdentified: Annotation<boolean>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => false,
  }),
  selectedIndexPattern: Annotation<string>({
    reducer: (currentValue, newValue) => newValue ?? currentValue,
    default: () => "",
  }),
});
