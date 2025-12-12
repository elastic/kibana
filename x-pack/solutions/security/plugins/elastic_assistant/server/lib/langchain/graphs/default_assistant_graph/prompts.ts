/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate, MessagesPlaceholder, PromptTemplate } from '@langchain/core/prompts';
import type { BaseMessage } from '@langchain/core/messages';
import type { ContentReferencesStore, DocumentEntry } from '@kbn/elastic-assistant-common';
import { enrichDocument } from '@kbn/elastic-assistant-common';
import type { Logger } from '@kbn/logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ChatPromptValueInterface } from '@langchain/core/prompt_values';
import { enrichConversation } from '../../utils/enrich_graph_input_messages';
import type { AIAssistantKnowledgeBaseDataClient } from '../../../../ai_assistant_data_clients/knowledge_base';
import { INCLUDE_CITATIONS } from '../../../prompt/prompts';

interface ChatPromptTemplateInputValues {
  systemPrompt: string;
  messages: BaseMessage[];
  knowledgeHistory: string;
}

interface Inputs {
  prompt: string;
  additionalPrompt?: string;
  contentReferencesStore: ContentReferencesStore;
  kbClient?: AIAssistantKnowledgeBaseDataClient;
  conversationMessages: BaseMessage[];
  logger: Logger;
  formattedTime: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  savedObjectsClient: SavedObjectsClientContract;
  connectorId: string;
  llmType: string | undefined;
}

export const DEFAULT_ASSISTANT_GRAPH_PROMPT_TEMPLATE = ChatPromptTemplate.fromMessages<{
  systemPrompt: string;
  messages: BaseMessage[];
}>([['system', '{systemPrompt}\n\n{knowledgeHistory}'], new MessagesPlaceholder('messages')]);

const KNOWLEDGE_HISTORY_PREFIX = 'Knowledge History:';
const NO_KNOWLEDGE_HISTORY = '[No existing knowledge history]';

const formatKnowledgeHistory = <T extends { text: string }>(knowledgeHistory: T[]) => {
  return knowledgeHistory.length
    ? `${KNOWLEDGE_HISTORY_PREFIX}\n${knowledgeHistory.map((e) => e.text).join('\n')}`
    : NO_KNOWLEDGE_HISTORY;
};

/**
 * Factory that creates a ChatPromptValueInterface from a ChatPromptTemplate with the given inputs.
 * This should be used to create the initial messages state for the graph.
 */
export const chatPromptFactory = async (
  chatPromptTemplate: ChatPromptTemplate<ChatPromptTemplateInputValues>,
  inputs: Inputs
): Promise<ChatPromptValueInterface> => {
  const knowledgeHistoryPromise: Promise<DocumentEntry[]> =
    inputs.kbClient?.getRequiredKnowledgeBaseDocumentEntries() ?? Promise.resolve([]);

  const knowledgeHistory = await knowledgeHistoryPromise;
  const citedKnowledgeHistory = knowledgeHistory.map(enrichDocument(inputs.contentReferencesStore));
  const formattedKnowledgeHistory = formatKnowledgeHistory(citedKnowledgeHistory);

  const templatedSystemPrompt = inputs.additionalPrompt
    ? `${inputs.prompt}\n\n${inputs.additionalPrompt}`
    : inputs.prompt;

  const systemPromptTemplate = PromptTemplate.fromTemplate(templatedSystemPrompt);

  const systemPrompt = await systemPromptTemplate.format({
    citations_prompt: inputs.contentReferencesStore.options?.disabled ? '' : INCLUDE_CITATIONS,
    formattedTime: inputs.formattedTime ?? '',
  });

  const enrichedMessages = await enrichConversation({
    actionsClient: inputs.actionsClient,
    savedObjectsClient: inputs.savedObjectsClient,
    connectorId: inputs.connectorId,
    llmType: inputs.llmType,
    messages: inputs.conversationMessages,
  });

  const chatPrompt = await chatPromptTemplate.invoke({
    systemPrompt,
    messages: enrichedMessages,
    knowledgeHistory: formattedKnowledgeHistory,
  });

  return chatPrompt;
};
