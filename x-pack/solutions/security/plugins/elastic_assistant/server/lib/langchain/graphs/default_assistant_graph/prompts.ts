/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { TOOL_CALLING_LLM_TYPES } from './agentRunnable';
import { BaseMessage } from '@langchain/core/messages';
import { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';
import { ContentReferencesStore, DocumentEntry, enrichDocument } from '@kbn/elastic-assistant-common';
import { ChatPromptValueInterface } from '@langchain/core/prompt_values';
import { AIAssistantConversationsDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/conversations';
import type { Logger } from '@kbn/logging';
import { INCLUDE_CITATIONS } from '../../../prompt/prompts';

const formatPromptToolcalling = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{knowledge_history}'],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

const formatPromptStructured = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{knowledge_history}'],
    ['placeholder', '{chat_history}'],
    [
      'human',
      '{input}\n\n{agent_scratchpad}\n\n(reminder to respond in a JSON blob no matter what)',
    ],
  ]);

export const formatPrompt = ({
  llmType,
  prompt,
  additionalPrompt,
}: {
  llmType: string | undefined;
  prompt: string;
  additionalPrompt?: string;
}) => {
  if (llmType && TOOL_CALLING_LLM_TYPES.has(llmType)) {
    return formatPromptToolcalling(prompt, additionalPrompt);
  }
  return formatPromptStructured(prompt, additionalPrompt);
};



type ChatPromptTemplateInputValues = {
  systemPrompt: string;
  knowledgeHistory: string;
  messages: BaseMessage[];
}

type Inputs = {
  prompt: string;
  additionalPrompt?: string;
  contentReferencesStore: ContentReferencesStore;
  kbClient?: AIAssistantKnowledgeBaseDataClient;
  conversationMessages: BaseMessage[];
  logger: Logger
  formattedTime: string;
}

const KNOWLEDGE_HISTORY_PREFIX = 'Knowledge History:';
const NO_KNOWLEDGE_HISTORY = '[No existing knowledge history]';

const formatKnowledgeHistory = <T extends { text: string }>(knowledgeHistory: T[]) => {
  return knowledgeHistory.length
    ? `${KNOWLEDGE_HISTORY_PREFIX}\n${knowledgeHistory.map((e) => e.text).join('\n')}`
    : NO_KNOWLEDGE_HISTORY;
}

/**
 * Factory that creates a ChatPromptValueInterface from a ChatPromptTemplate with the given inputs.
 * This should be used to create the initial messages state for the graph.
 */
export const chatPromptValueFactory = async (chatPromptTemplate: ChatPromptTemplate<ChatPromptTemplateInputValues, any>, inputs: Inputs): Promise<ChatPromptValueInterface> => {

  const knowledgeHistoryPromise: Promise<DocumentEntry[]> = inputs.kbClient?.getRequiredKnowledgeBaseDocumentEntries() ?? Promise.resolve([]);

  const knowledgeHistory = await knowledgeHistoryPromise;
  const citedKnowledgeHistory = knowledgeHistory.map(enrichDocument(inputs.contentReferencesStore));
  const formattedKnowledgeHistory = formatKnowledgeHistory(citedKnowledgeHistory);

  const templatedSystemPrompt = inputs.additionalPrompt ? `${inputs.prompt}\n\n${inputs.additionalPrompt}` : inputs.prompt

  console.log(templatedSystemPrompt)
  const systemPromptTemplate = PromptTemplate.fromTemplate(templatedSystemPrompt);

  const systemPrompt = await systemPromptTemplate.format({
    citations_prompt: inputs.contentReferencesStore.options?.disabled ? '' : INCLUDE_CITATIONS,
    formattedTime: inputs.formattedTime ?? '',
    knowledgeHistory: formattedKnowledgeHistory
  })

  const chatPrompt = await chatPromptTemplate.invoke({
    knowledgeHistory: formattedKnowledgeHistory,
    systemPrompt: systemPrompt,
    messages: inputs.conversationMessages,
  })

  return chatPrompt
}