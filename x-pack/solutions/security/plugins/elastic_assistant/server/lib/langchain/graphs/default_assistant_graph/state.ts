/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

export const AssistantStateAnnotation = Annotation.Root({
  lastNode: Annotation<string>({
    reducer: (x: string, y?: string) => y ?? x,
    default: () => 'start',
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  llmType: Annotation<string>({
    reducer: (x: string, y?: string) => y ?? x,
    default: () => 'unknown',
  }),
  isStream: Annotation<boolean>({
    reducer: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  }),
  isOssModel: Annotation<boolean>({
    reducer: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  }),
  connectorId: Annotation<string>({
    reducer: (x: string, y?: string) => y ?? x,
    default: () => '',
  }),
  conversationId: Annotation<string>({
    reducer: (x: string, y?: string) => y ?? x,
    default: () => '',
  }),
  responseLanguage: Annotation<string>({
    reducer: (x: string, y?: string) => y ?? x,
    default: () => 'English',
  }),
  provider: Annotation<string>({
    reducer: (x: string, y?: string) => y ?? x,
    default: () => '',
  }),
});
