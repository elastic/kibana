/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Message,
  MessageAddEvent,
  MessageRole,
  StreamingChatResponseEvent,
} from '@kbn/observability-ai-assistant-plugin/common';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { Readable } from 'stream';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../../shared/services';
import { ObservabilityAIAssistantApiClient } from '../../../common/observability_ai_assistant_api_client';

function decodeEvents(body: Readable | string) {
  return String(body)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamingChatResponseEvent);
}

export function getMessageAddedEvents(body: Readable | string) {
  return decodeEvents(body).filter(
    (event): event is MessageAddEvent => event.type === 'messageAdd'
  );
}

export async function invokeChatCompleteWithFunctionRequest({
  connectorId,
  observabilityAIAssistantAPIClient,
  functionCall,
  roleAuthc,
  internalReqHeader,
  scopes,
}: {
  connectorId: string;
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient;
  functionCall: Message['message']['function_call'];
  scopes?: AssistantScope[];
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
}) {
  const { body } = await observabilityAIAssistantAPIClient
    .slsUser({
      endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
      internalReqHeader,
      roleAuthc,
      params: {
        body: {
          messages: [
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.Assistant,
                content: '',
                function_call: functionCall,
              },
            },
          ],
          connectorId,
          persist: false,
          screenContexts: [],
          scopes: scopes || (['observability'] as AssistantScope[]),
        },
      },
    })
    .expect(200);

  return body;
}
