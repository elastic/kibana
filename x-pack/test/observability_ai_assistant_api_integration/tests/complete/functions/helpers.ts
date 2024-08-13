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
import { ToolingLog } from '@kbn/tooling-log';
import { Agent } from 'supertest';
import { Readable } from 'stream';
import { CreateTest } from '../../../common/config';
import { createLlmProxy, LlmProxy } from '../../../common/create_llm_proxy';

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

export async function createLLMProxyConnector({
  log,
  supertest,
}: {
  log: ToolingLog;
  supertest: Agent;
}) {
  try {
    const proxy = await createLlmProxy(log);

    const response = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name: 'OpenAI Proxy',
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: `http://localhost:${proxy.getPort()}`,
        },
        secrets: {
          apiKey: 'my-api-key',
        },
      })
      .expect(200);

    return {
      proxy,
      connectorId: response.body.id,
    };
  } catch (e) {
    log.error(`Failed to create LLM proxy connector due to: ${e}`);
    throw e;
  }
}

export async function deleteLLMProxyConnector({
  supertest,
  connectorId,
  proxy,
  log,
}: {
  supertest: Agent;
  connectorId: string;
  proxy: LlmProxy;
  log: ToolingLog;
}) {
  try {
    await supertest
      .delete(`/api/actions/connector/${connectorId}`)
      .set('kbn-xsrf', 'foo')
      .expect(204);

    proxy.close();
  } catch (e) {
    log.error(`Failed to delete LLM proxy connector with id ${connectorId} due to: ${e}`);
    throw e;
  }
}

export async function invokeChatCompleteWithFunctionRequest({
  connectorId,
  observabilityAIAssistantAPIClient,
  functionCall,
}: {
  connectorId: string;
  observabilityAIAssistantAPIClient: Awaited<
    ReturnType<CreateTest['services']['observabilityAIAssistantAPIClient']>
  >;
  functionCall: Message['message']['function_call'];
}) {
  const { body } = await observabilityAIAssistantAPIClient
    .editorUser({
      endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
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
        },
      },
    })
    .expect(200);

  return body;
}
