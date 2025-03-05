/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageAddEvent, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { last } from 'lodash';
import { GET_RELEVANT_FIELD_NAMES_SYSTEM_MESSAGE } from '@kbn/observability-ai-assistant-plugin/server/functions/get_dataset_info/get_relevant_field_names';
import { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import {
  LlmProxy,
  RelevantField,
  createLlmProxy,
} from '../../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { getMessageAddedEvents } from './helpers';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { createSimpleSyntheticLogs } from '../../synthtrace_scenarios/simple_logs';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('get_dataset_info', function () {
    this.tags(['failsOnMKI']);
    let llmProxy: LlmProxy;
    let connectorId: string;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: llmProxy.getPort(),
      });
    });

    after(async () => {
      llmProxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
    });

    // Calling `get_dataset_info` via the chat/complete endpoint
    describe('POST /internal/observability_ai_assistant/chat/complete', function () {
      let messageAddedEvents: MessageAddEvent[];
      let logSynthtraceEsClient: LogsSynthtraceEsClient;
      let primarySystemMessage: string;
      let getRelevantFields: () => Promise<RelevantField[]>;

      const USER_MESSAGE = 'Do I have any Apache logs?';

      before(async () => {
        ({ logSynthtraceEsClient } = await createSimpleSyntheticLogs({ getService }));
        primarySystemMessage = await getSystemMessage(getService);

        void llmProxy.interceptWithFunctionRequest({
          name: 'get_dataset_info',
          arguments: () => JSON.stringify({ index: 'logs*' }),
          when: () => true,
        });

        ({ getRelevantFields } = llmProxy.interceptSelectRelevantFieldsToolChoice());

        void llmProxy.interceptConversation(`Yes, you do have logs. Congratulations! 🎈️🎈️🎈️`);

        const { status, body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
          params: {
            body: {
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: USER_MESSAGE,
                  },
                },
              ],
              connectorId,
              persist: false,
              screenContexts: [],
              scopes: ['observability' as const],
            },
          },
        });

        expect(status).to.be(200);

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        messageAddedEvents = getMessageAddedEvents(body);
      });

      after(async () => {
        await logSynthtraceEsClient.clean();
      });

      describe('LLM requests', () => {
        let firstRequestBody: ChatCompletionStreamParams;
        let secondRequestBody: ChatCompletionStreamParams;
        let thirdRequestBody: ChatCompletionStreamParams;

        before(async () => {
          firstRequestBody = llmProxy.interceptedRequests[0].requestBody;
          secondRequestBody = llmProxy.interceptedRequests[1].requestBody;
          thirdRequestBody = llmProxy.interceptedRequests[2].requestBody;
        });

        it('makes 3 requests to the LLM', () => {
          expect(llmProxy.interceptedRequests.length).to.be(3);
        });

        describe('every request to the LLM', () => {
          it('contains a system message', () => {
            const everyRequestHasSystemMessage = llmProxy.interceptedRequests.every(
              ({ requestBody }) => {
                const firstMessage = requestBody.messages[0];
                return (
                  firstMessage.role === 'system' &&
                  (firstMessage.content as string).includes('You are a helpful assistant')
                );
              }
            );
            expect(everyRequestHasSystemMessage).to.be(true);
          });

          it('contains the original user message', () => {
            const everyRequestHasUserMessage = llmProxy.interceptedRequests.every(
              ({ requestBody }) =>
                requestBody.messages.some(
                  (message) =>
                    message.role === 'user' && (message.content as string) === USER_MESSAGE
                )
            );
            expect(everyRequestHasUserMessage).to.be(true);
          });

          it('contains the context function request and context function response', () => {
            const everyRequestHasContextFunction = llmProxy.interceptedRequests.every(
              ({ requestBody }) => {
                const hasContextFunctionRequest = requestBody.messages.some(
                  (message) =>
                    message.role === 'assistant' &&
                    message.tool_calls?.[0]?.function?.name === 'context'
                );

                const hasContextFunctionResponse = requestBody.messages.some(
                  (message) =>
                    message.role === 'tool' &&
                    (message.content as string).includes('screen_description') &&
                    (message.content as string).includes('learnings')
                );

                return hasContextFunctionRequest && hasContextFunctionResponse;
              }
            );

            expect(everyRequestHasContextFunction).to.be(true);
          });
        });

        describe('The first request', () => {
          it('contains the correct number of messages', () => {
            expect(firstRequestBody.messages.length).to.be(4);
          });

          it('contains the `get_dataset_info` tool', () => {
            const hasTool = firstRequestBody.tools?.some(
              (tool) => tool.function.name === 'get_dataset_info'
            );

            expect(hasTool).to.be(true);
          });

          it('leaves the function calling decision to the LLM via tool_choice=auto', () => {
            expect(firstRequestBody.tool_choice).to.be('auto');
          });

          describe('The system message', () => {
            it('has the primary system message', () => {
              expect(systemMessageSorted(firstRequestBody.messages[0].content as string)).to.eql(
                systemMessageSorted(primarySystemMessage)
              );
            });

            it('has a different system message from request 2', () => {
              expect(firstRequestBody.messages[0]).not.to.eql(secondRequestBody.messages[0]);
            });

            it('has the same system message as request 3', () => {
              expect(firstRequestBody.messages[0]).to.eql(thirdRequestBody.messages[0]);
            });
          });
        });

        describe('The second request', () => {
          it('contains the correct number of messages', () => {
            expect(secondRequestBody.messages.length).to.be(5);
          });

          it('contains a system generated user message with a list of field candidates', () => {
            const lastMessage = last(secondRequestBody.messages);

            expect(lastMessage?.role).to.be('user');
            expect(lastMessage?.content).to.contain('Below is a list of fields');
            expect(lastMessage?.content).to.contain('@timestamp');
          });

          it('instructs the LLM to call the `select_relevant_fields` tool via `tool_choice`', () => {
            const hasToolChoice =
              // @ts-expect-error
              secondRequestBody.tool_choice?.function?.name === 'select_relevant_fields';

            expect(hasToolChoice).to.be(true);
          });

          it('has a custom, function-specific system message', () => {
            expect(secondRequestBody.messages[0].content).to.be(
              GET_RELEVANT_FIELD_NAMES_SYSTEM_MESSAGE
            );
          });
        });

        describe('The third request', () => {
          it('contains the correct number of messages', () => {
            expect(thirdRequestBody.messages.length).to.be(6);
          });

          it('contains the `get_dataset_info` request', () => {
            const hasFunctionRequest = thirdRequestBody.messages.some(
              (message) =>
                message.role === 'assistant' &&
                message.tool_calls?.[0]?.function?.name === 'get_dataset_info'
            );

            expect(hasFunctionRequest).to.be(true);
          });

          it('contains the `get_dataset_info` response', () => {
            const functionResponseMessage = last(thirdRequestBody.messages);
            const parsedContent = JSON.parse(functionResponseMessage?.content as string);
            expect(Object.keys(parsedContent)).to.eql(['indices', 'fields', 'stats']);
            expect(parsedContent.indices).to.eql(['logs-web.access-default']);
          });

          it('emits a messageAdded event with the `get_dataset_info` function response', async () => {
            const event = messageAddedEvents.find(
              ({ message }) =>
                message.message.role === MessageRole.User &&
                message.message.name === 'get_dataset_info'
            );

            const parsedContent = JSON.parse(event?.message.message.content!) as {
              indices: string[];
              fields: string[];
            };

            const fieldNamesWithType = parsedContent.fields;
            const fieldNamesWithoutType = fieldNamesWithType.map((field) => field.split(':')[0]);

            const relevantFields = await getRelevantFields();
            expect(fieldNamesWithoutType).to.eql(relevantFields.map(({ name }) => name));
            expect(parsedContent.indices).to.eql(['logs-web.access-default']);
          });
        });
      });

      describe('messageAdded events', () => {
        it('emits 5 messageAdded events', () => {
          expect(messageAddedEvents.length).to.be(5);
        });
      });
    });

    // Calling `get_dataset_info` directly
    describe('GET /internal/observability_ai_assistant/functions/get_dataset_info', () => {
      let logSynthtraceEsClient: LogsSynthtraceEsClient;

      before(async () => {
        ({ logSynthtraceEsClient } = await createSimpleSyntheticLogs({
          getService,
          dataset: 'zookeeper.access',
        }));
      });

      after(async () => {
        await logSynthtraceEsClient.clean();
      });

      it('returns nothing when requesting "zookeeper" logs', async () => {
        const { body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/functions/get_dataset_info',
          params: {
            query: {
              index: 'zookeeper',
              connectorId,
            },
          },
        });

        expect(body).to.eql({
          indices: [],
          fields: [],
        });
      });

      it('returns something when requesting "logs"', async () => {
        llmProxy.interceptSelectRelevantFieldsToolChoice({ to: 20 });

        const { body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/functions/get_dataset_info',
          params: {
            query: {
              index: 'logs',
              connectorId,
            },
          },
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(body).to.eql({
          indices: ['logs-zookeeper.access-default'],
          fields: [
            '@timestamp:date',
            '_id:_id',
            '_ignored:string',
            '_index:_index',
            '_score:number',
            '_source:_source',
            'data_stream.dataset:keyword',
            'data_stream.namespace:keyword',
            'data_stream.type:keyword',
            'event.dataset:keyword',
            'host.name:keyword',
            'input.type:keyword',
            'message:text',
            'network.bytes:long',
            'tls.established:boolean',
          ],
          stats: {
            analyzed: 15,
            total: 15,
          },
        });
      });
    });
  });
}

// order of instructions can vary, so we sort to compare them
function systemMessageSorted(message: string) {
  return message
    .split('\n\n')
    .map((line) => line.trim())
    .sort();
}

async function getSystemMessage(getService: DeploymentAgnosticFtrProviderContext['getService']) {
  const apiClient = getService('observabilityAIAssistantApi');

  const { body } = await apiClient.editor({
    endpoint: 'GET /internal/observability_ai_assistant/functions',
    params: {
      query: {
        scopes: ['observability'],
      },
    },
  });

  return body.systemMessage;
}
