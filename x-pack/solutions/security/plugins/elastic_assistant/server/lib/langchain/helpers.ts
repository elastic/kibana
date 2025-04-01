/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import type { DefendInsightsPostRequestBody, Message } from '@kbn/elastic-assistant-common';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  AttackDiscoveryPostRequestBody,
  ExecuteConnectorRequestBody,
} from '@kbn/elastic-assistant-common';

export const getLangChainMessage = (
  assistantMessage: Pick<Message, 'content' | 'role'>
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

export const getLangChainMessages = (
  assistantMessages: Array<Pick<Message, 'content' | 'role'>>
): BaseMessage[] => assistantMessages.map(getLangChainMessage);

export const requestHasRequiredAnonymizationParams = (
  request: KibanaRequest<
    unknown,
    unknown,
    ExecuteConnectorRequestBody | AttackDiscoveryPostRequestBody | DefendInsightsPostRequestBody
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
