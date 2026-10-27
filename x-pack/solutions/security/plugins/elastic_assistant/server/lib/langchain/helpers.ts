/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  DefendInsightsPostRequestBody,
  Message,
  PostAttackDiscoveryGenerateRequestBody,
  ExecuteConnectorRequestBody,
} from '@kbn/elastic-assistant-common';
import type { BaseMessage } from '@langchain/core/messages';

// this file is imported at plugin startup (via the security_solution assistant tools),
// so langchain message classes are loaded lazily inside the functions below
type LangChainMessagesModule = typeof import('@langchain/core/messages');

const toLangChainMessage = (
  assistantMessage: Pick<Message, 'content' | 'role'>,
  { AIMessage, HumanMessage, SystemMessage }: LangChainMessagesModule
): BaseMessage => {
  switch (assistantMessage.role) {
    case 'system':
      return new SystemMessage(assistantMessage.content ?? '');
    case 'user':
      return new HumanMessage(assistantMessage.content ?? '');
    case 'assistant':
      return new AIMessage(assistantMessage.content ?? '');
    default:
      return new HumanMessage(assistantMessage.content ?? '');
  }
};

export const getLangChainMessage = async (
  assistantMessage: Pick<Message, 'content' | 'role'>
): Promise<BaseMessage> =>
  toLangChainMessage(assistantMessage, await import('@langchain/core/messages'));

export const getLangChainMessages = async (
  assistantMessages: Array<Pick<Message, 'content' | 'role'>>
): Promise<BaseMessage[]> => {
  const langChainMessagesModule = await import('@langchain/core/messages');
  return assistantMessages.map((message) => toLangChainMessage(message, langChainMessagesModule));
};

export const requestHasRequiredAnonymizationParams = (
  request: KibanaRequest<
    unknown,
    unknown,
    | ExecuteConnectorRequestBody
    | PostAttackDiscoveryGenerateRequestBody
    | DefendInsightsPostRequestBody
  >
): boolean => {
  const { replacements } = request?.body ?? {};

  const replacementsIsValid =
    typeof replacements === 'object' &&
    Object.keys(replacements).every(
      (key) => typeof key === 'string' && typeof replacements[key] === 'string'
    );

  return replacementsIsValid;
};
