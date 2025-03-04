/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationResponse } from '@kbn/elastic-assistant-common';
import { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';
import { AgentStep } from 'langchain/agents';

export const getStateAnnotation = ({ getFormattedTime }: { getFormattedTime?: () => string }) => {
  const graphAnnotation = Annotation.Root({
    input: Annotation<string>({
      reducer: (x: string, y?: string) => y ?? x,
      default: () => '',
    }),
    lastNode: Annotation<string>({
      reducer: (x: string, y?: string) => y ?? x,
      default: () => 'start',
    }),
    steps: Annotation<AgentStep[]>({
      reducer: (x: AgentStep[], y: AgentStep[]) => x.concat(y),
      default: () => [],
    }),
    hasRespondStep: Annotation<boolean>({
      reducer: (x: boolean, y?: boolean) => y ?? x,
      default: () => false,
    }),
    /**
     * Messages is a list of messages that were created during the graph execution
     */
    messages: Annotation<BaseMessage[]>({
      reducer: (currentState, updateValue) => currentState.concat(updateValue),
      default: () => [],
    }),
    /**
     * Chat history is a list of messages that have been sent and received in the chat prior to the graph execution
     */
    chatHistory: Annotation<BaseMessage[]>({
      reducer: (currentState, updateValue) => updateValue ?? currentState,
      default: () => [],
    }),
    chatTitle: Annotation<string>({
      reducer: (x: string, y?: string) => y ?? x,
      default: () => '',
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
    conversation: Annotation<ConversationResponse | undefined>({
      reducer: (x: ConversationResponse | undefined, y?: ConversationResponse | undefined) =>
        y ?? x,
      default: () => undefined,
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
    formattedTime: Annotation<string>({
      reducer: (x: string, y?: string) => y ?? x,
      default: getFormattedTime ?? (() => ''),
    }),
  });

  return graphAnnotation;
};
