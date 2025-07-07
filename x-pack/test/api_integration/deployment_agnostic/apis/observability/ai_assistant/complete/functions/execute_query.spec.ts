/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageAddEvent } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { last } from 'lodash';
import { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { chatComplete } from './helpers';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { createSimpleSyntheticLogs } from '../../synthtrace_scenarios/simple_logs';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const synthtrace = getService('synthtrace');

  describe('execute_query', function () {
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

    // Calling `execute_query` via the chat/complete endpoint
    describe('POST /internal/observability_ai_assistant/chat/complete', function () {
      let messageAddedEvents: MessageAddEvent[];
      let logsSynthtraceEsClient: LogsSynthtraceEsClient;
      let firstRequestBody: ChatCompletionStreamParams;
      let secondRequestBody: ChatCompletionStreamParams;
      let thirdRequestBody: ChatCompletionStreamParams;
      let fourthRequestBody: ChatCompletionStreamParams;

      before(async () => {
        logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
        await createSimpleSyntheticLogs({
          logsSynthtraceEsClient,
          dataset: 'apache.access',
        });

        void llmProxy.interceptWithFunctionRequest({
          name: 'query',
          arguments: () => JSON.stringify({}),
          when: () => true,
        });

        void llmProxy.interceptWithFunctionRequest({
          name: 'structuredOutput',
          arguments: () => JSON.stringify({}),
          // @ts-expect-error
          when: (requestBody) => requestBody.tool_choice?.function?.name === 'structuredOutput',
        });

        void llmProxy.interceptWithFunctionRequest({
          name: 'execute_query',
          arguments: () =>
            JSON.stringify({
              query: `FROM logs-apache.access-default
            | KEEP message
            | SORT @timestamp DESC
            | LIMIT 10`,
            }),
          when: () => true,
        });

        void llmProxy.interceptConversation({ content: 'Hello from user' });

        ({ messageAddedEvents } = await chatComplete({
          userPrompt: 'Please retrieve the most recent Apache log messages',
          connectorId,
          observabilityAIAssistantAPIClient,
        }));

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        firstRequestBody = llmProxy.interceptedRequests[0].requestBody;
        secondRequestBody = llmProxy.interceptedRequests[1].requestBody;
        thirdRequestBody = llmProxy.interceptedRequests[2].requestBody;
        fourthRequestBody = llmProxy.interceptedRequests[3].requestBody;
      });

      after(async () => {
        await logsSynthtraceEsClient.clean();
      });

      it('makes 4 requests to the LLM', () => {
        expect(llmProxy.interceptedRequests.length).to.be(4);
      });

      it('emits 7 messageAdded events', () => {
        expect(messageAddedEvents.length).to.be(7);
      });

      describe('First LLM request - Initial tool selection', () => {
        it('exposes the right tools', () => {
          expect(firstRequestBody.tools?.map((t) => t.function.name)).to.eql([
            'query',
            'get_alerts_dataset_info',
            'alerts',
            'changes',
            'elasticsearch',
            'kibana',
            'get_dataset_info',
            'execute_connector',
          ]);
        });
      });

      describe('The second request - Structured output validation', () => {
        it('contains the correct number of messages', () => {
          expect(secondRequestBody.messages.length).to.be(6);
        });

        it('contains the `structuredOutput` tool choice', () => {
          // @ts-expect-error
          const hasToolChoice = secondRequestBody.tool_choice.function?.name === 'structuredOutput';
          expect(hasToolChoice).to.be(true);
        });

        it('contains user message with information about how to request ESQL documentation', () => {
          expect(last(secondRequestBody.messages)?.content).to.contain(
            'Based on the previous conversation, request documentation'
          );
        });
      });

      describe('The third request - Requesting ESQL documentation', () => {
        it('contains the `request_documentation` tool call request', () => {
          const hasToolCall = thirdRequestBody.messages.some(
            // @ts-expect-error
            (message) => message.tool_calls?.[0]?.function?.name === 'request_documentation'
          );
          expect(hasToolCall).to.be(true);
        });

        it('contains ESQL documentation', () => {
          const parsed = JSON.parse(last(thirdRequestBody.messages)?.content as string);
          expect(parsed.documentation.OPERATORS).to.contain('Binary Operators');
        });

        it('allows the LLM to call the tools execute_query, visualize_query and request_documentation', () => {
          expect(thirdRequestBody.tools?.map((t) => t.function.name)).to.eql([
            'execute_query',
            'visualize_query',
            'request_documentation',
          ]);
        });
      });

      describe('The fourth request - executing the ES|QL query', () => {
        it('should not contain the `execute_query` tool call request', () => {
          const hasToolCall = fourthRequestBody.messages.some(
            // @ts-expect-error
            (message) => message.tool_calls?.[0]?.function?.name === 'execute_query'
          );
          expect(hasToolCall).to.be(false);
        });

        it('emits a messageAdded event with the `execute_query` tool response', () => {
          const event = messageAddedEvents.find(
            ({ message }) => message.message.name === 'execute_query'
          );
          expect(event?.message.message.content).to.contain('simple log message');
        });

        describe('tool call collapsing', () => {
          it('collapses the `execute_query` tool call into the `query` tool response', () => {
            const content = JSON.parse(last(fourthRequestBody.messages)?.content as string);
            expect(content.steps).to.have.length(2);

            const [toolRequest, toolResponse] = content.steps;

            // visualize_query tool request (sent by the LLM)
            expect(toolRequest.role).to.be('assistant');
            expect(toolRequest.toolCalls[0].function.name).to.be('execute_query');

            // visualize_query tool response (sent by AI Assistant)
            expect(toolResponse.role).to.be('tool');
            expect(toolResponse.name).to.be('execute_query');
          });

          it('contains the `execute_query` tool call request', () => {
            const toolCallRequest = JSON.parse(last(fourthRequestBody.messages)?.content as string)
              .steps[0].toolCalls[0];
            expect(toolCallRequest.function.name).to.be('execute_query');
            expect(toolCallRequest.function.arguments.query).to.contain(
              'FROM logs-apache.access-default'
            );
          });

          describe('the `execute_query` response', () => {
            let toolCallResponse: {
              columns: EsqlToRecords<any>['columns'];
              rows: EsqlToRecords<any>['records'];
            };

            before(async () => {
              toolCallResponse = JSON.parse(last(fourthRequestBody.messages)?.content as string)
                .steps[1].response;
            });

            it('has the correct columns', () => {
              expect(toolCallResponse.columns.map(({ name }) => name)).to.eql([
                'message',
                '@timestamp',
              ]);
            });

            it('has the correct number of rows', () => {
              expect(toolCallResponse.rows.length).to.be(10);
            });

            it('has the right log message', () => {
              expect(toolCallResponse.rows[0][0]).to.be('simple log message');
            });
          });
        });
      });
    });
  });
}
