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
import { LlmProxy, RelevantField, createLlmProxy } from '../../utils/create_llm_proxy';
import { chatComplete, getSystemMessage, systemMessageSorted } from '../../utils/conversation';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { createSimpleSyntheticLogs } from '../../synthtrace_scenarios/simple_logs';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const synthtrace = getService('synthtrace');

  describe('tool: get_dataset_info', function () {
    this.tags(['skipCloud']);
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

    afterEach(async () => {
      llmProxy.clear();
    });

    // Calling `get_dataset_info` via the chat/complete endpoint
    describe('POST /internal/observability_ai_assistant/chat/complete', function () {
      let messageAddedEvents: MessageAddEvent[];
      let logsSynthtraceEsClient: LogsSynthtraceEsClient;
      let getRelevantFields: () => Promise<RelevantField[]>;
      let firstRequestBody: ChatCompletionStreamParams;
      let secondRequestBody: ChatCompletionStreamParams;
      let thirdRequestBody: ChatCompletionStreamParams;

      const USER_MESSAGE = 'Do I have any Apache logs?';

      before(async () => {
        logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
        await createSimpleSyntheticLogs({ logsSynthtraceEsClient });

        void llmProxy.interceptWithFunctionRequest({
          name: 'get_dataset_info',
          arguments: () => JSON.stringify({ index: 'logs*' }),
        });

        ({ getRelevantFields } = llmProxy.interceptSelectRelevantFieldsToolChoice());

        void llmProxy.interceptWithResponse(`Yes, you do have logs. Congratulations! 🎈️🎈️🎈️`);

        ({ messageAddedEvents } = await chatComplete({
          userPrompt: USER_MESSAGE,
          connectorId,
          observabilityAIAssistantAPIClient,
        }));

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        firstRequestBody = llmProxy.interceptedRequests[0].requestBody;
        secondRequestBody = llmProxy.interceptedRequests[1].requestBody;
        thirdRequestBody = llmProxy.interceptedRequests[2].requestBody;
      });

      after(async () => {
        await logsSynthtraceEsClient.clean();
      });

      afterEach(async () => {
        llmProxy.clear();
      });

      it('makes 3 requests to the LLM', () => {
        expect(llmProxy.interceptedRequests.length).to.be(3);
      });

      it('emits 5 messageAdded events', () => {
        expect(messageAddedEvents.length).to.be(5);
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
          const everyRequestHasUserMessage = llmProxy.interceptedRequests.every(({ requestBody }) =>
            requestBody.messages.some(
              (message) => message.role === 'user' && (message.content as string) === USER_MESSAGE
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
          it('has the primary system message', async () => {
            const primarySystemMessage = await getSystemMessage(getService);
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
          expect(parsedContent.indices).to.contain('logs-web.access-default');
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
          expect(parsedContent.indices).to.contain('logs-web.access-default');
        });
      });
    });

    // Calling `get_dataset_info` directly
    describe('GET /internal/observability_ai_assistant/functions/get_dataset_info', () => {
      let logsSynthtraceEsClient: LogsSynthtraceEsClient;

      before(async () => {
        logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
        await Promise.all([
          createSimpleSyntheticLogs({ logsSynthtraceEsClient, dataset: 'zookeeper.access' }),
          createSimpleSyntheticLogs({ logsSynthtraceEsClient, dataset: 'apache.access' }),
        ]);
      });

      after(async () => {
        await logsSynthtraceEsClient.clean();
      });

      it('returns Zookeeper logs but not the Apache logs', async () => {
        llmProxy.interceptSelectRelevantFieldsToolChoice({ to: 20 });

        const { body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/functions/get_dataset_info',
          params: {
            query: {
              index: 'zookeeper',
              connectorId,
            },
          },
        });

        expect(body.indices).to.eql(['logs-zookeeper.access-default']);
        expect(body.fields.length).to.be.greaterThan(0);
      });

      it('returns both Zookeeper and Apache logs', async () => {
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

        expect(body.indices).to.contain('logs-apache.access-default');
        expect(body.indices).to.contain('logs-zookeeper.access-default');
        expect(body.fields.length).to.be.greaterThan(0);
      });

      it('accepts a comma-separated of patterns', async () => {
        llmProxy.interceptSelectRelevantFieldsToolChoice({ to: 20 });

        const { body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/functions/get_dataset_info',
          params: {
            query: {
              index: 'zookeeper,apache',
              connectorId,
            },
          },
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(body.indices).to.eql([
          'logs-apache.access-default',
          'logs-zookeeper.access-default',
        ]);
      });

      it('handles no matching indices gracefully', async () => {
        const { body } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/functions/get_dataset_info',
          params: {
            query: {
              index: 'foobarbaz',
              connectorId,
            },
          },
        });

        expect(body.indices).to.eql([]);
        expect(body.fields).to.eql([]);
      });
    });
  });
}
