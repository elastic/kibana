/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MessageAddEvent } from '@kbn/observability-ai-assistant-plugin/common';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { ApmRuleType } from '@kbn/rule-data-utils';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { last } from 'lodash';
import { GET_RELEVANT_FIELD_NAMES_SYSTEM_MESSAGE } from '@kbn/observability-ai-assistant-plugin/server/functions/get_dataset_info/get_relevant_field_names';
import type { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import type { LlmProxy, RelevantField } from '../../utils/create_llm_proxy';
import { createLlmProxy } from '../../utils/create_llm_proxy';
import { createSyntheticApmData } from '../../synthtrace_scenarios/create_synthetic_apm_data';
import { chatComplete, getSystemMessage, systemMessageSorted } from '../../utils/conversation';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { APM_ALERTS_INDEX } from '../../../apm/alerts/helpers/alerting_helper';
import { createRule } from '../../utils/alerts';

const USER_MESSAGE = 'How many alerts do I have for the past 10 days?';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const alertingApi = getService('alertingApi');
  const samlAuth = getService('samlAuth');

  describe('tool: get_alerts_dataset_info', function () {
    this.tags(['skipCloud']);
    let llmProxy: LlmProxy;
    let connectorId: string;
    let messageAddedEvents: MessageAddEvent[];
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let internalReqHeader: InternalRequestHeader;
    let roleAuthc: RoleCredentials;
    let createdRuleId: string;
    let getRelevantFields: () => Promise<RelevantField[]>;

    before(async () => {
      internalReqHeader = samlAuth.getInternalRequestHeader();
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      ({ apmSynthtraceEsClient } = await createSyntheticApmData({ getService }));

      createdRuleId = await createRule({
        getService,
        roleAuthc,
        internalReqHeader,
        data: {
          ruleTypeId: ApmRuleType.ErrorCount,
          indexName: APM_ALERTS_INDEX,
          consumer: 'apm',
          environment: 'production',
          threshold: 1,
          windowSize: 1,
          windowUnit: 'h',
          ruleName: 'APM error threshold',
        },
      });

      llmProxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: llmProxy.getPort(),
      });

      void llmProxy.interceptWithFunctionRequest({
        name: 'get_alerts_dataset_info',
        arguments: () => JSON.stringify({ start: 'now-10d', end: 'now' }),
      });

      ({ getRelevantFields } = llmProxy.interceptSelectRelevantFieldsToolChoice());

      void llmProxy.interceptWithFunctionRequest({
        name: 'alerts',
        arguments: () => JSON.stringify({ start: 'now-10d', end: 'now' }),
      });

      void llmProxy.interceptWithResponse(
        `You have active alerts for the past 10 days. Back to work!`
      );

      ({ messageAddedEvents } = await chatComplete({
        userPrompt: USER_MESSAGE,
        connectorId,
        observabilityAIAssistantAPIClient,
      }));

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
    });

    after(async () => {
      llmProxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });

      await apmSynthtraceEsClient.clean();
      await alertingApi.cleanUpAlerts({
        roleAuthc,
        ruleId: createdRuleId,
        alertIndexName: APM_ALERTS_INDEX,
        consumer: 'apm',
      });

      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    afterEach(async () => {
      llmProxy.clear();
    });

    describe('POST /internal/observability_ai_assistant/chat/complete', () => {
      let firstRequestBody: ChatCompletionStreamParams;
      let secondRequestBody: ChatCompletionStreamParams;
      let thirdRequestBody: ChatCompletionStreamParams;
      let fourthRequestBody: ChatCompletionStreamParams;

      before(async () => {
        firstRequestBody = llmProxy.interceptedRequests[0].requestBody;
        secondRequestBody = llmProxy.interceptedRequests[1].requestBody;
        thirdRequestBody = llmProxy.interceptedRequests[2].requestBody;
        fourthRequestBody = llmProxy.interceptedRequests[3].requestBody;
      });

      it('makes 4 requests to the LLM', () => {
        expect(llmProxy.interceptedRequests.length).to.be(4);
      });

      it('emits 7 messageAdded events', () => {
        expect(messageAddedEvents.length).to.be(7);
      });

      it('emits messageAdded events in the correct order', async () => {
        const formattedMessageAddedEvents = messageAddedEvents.map(({ message }) => {
          const { role, name, function_call: functionCall } = message.message;
          if (functionCall) {
            return { function_call: functionCall, role };
          }

          return { name, role };
        });

        expect(formattedMessageAddedEvents).to.eql([
          {
            role: 'assistant',
            function_call: { name: 'context', trigger: 'assistant' },
          },
          { name: 'context', role: 'user' },
          {
            role: 'assistant',
            function_call: {
              name: 'get_alerts_dataset_info',
              arguments: '{"start":"now-10d","end":"now"}',
              trigger: 'assistant',
            },
          },
          { name: 'get_alerts_dataset_info', role: 'user' },
          {
            role: 'assistant',
            function_call: {
              name: 'alerts',
              arguments: '{"start":"now-10d","end":"now"}',
              trigger: 'assistant',
            },
          },
          { name: 'alerts', role: 'user' },
          {
            role: 'assistant',
            function_call: { name: '', arguments: '', trigger: 'assistant' },
          },
        ]);
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

        it('contains the `get_alerts_dataset_info` tool', () => {
          const hasTool = firstRequestBody.tools?.some(
            (tool) => tool.function.name === 'get_alerts_dataset_info'
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

          it('has the same system message as request 4', () => {
            expect(firstRequestBody.messages[0]).to.eql(fourthRequestBody.messages[0]);
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

        it('contains the `get_alerts_dataset_info` request', () => {
          const hasFunctionRequest = thirdRequestBody.messages.some(
            (message) =>
              message.role === 'assistant' &&
              message.tool_calls?.[0]?.function?.name === 'get_alerts_dataset_info'
          );

          expect(hasFunctionRequest).to.be(true);
        });

        it('contains the `get_alerts_dataset_info` response', async () => {
          const functionResponse = last(thirdRequestBody.messages);
          const parsedContent = JSON.parse(functionResponse?.content as string) as {
            fields: string[];
          };

          const fieldNamesWithType = parsedContent.fields;
          const fieldNamesWithoutType = fieldNamesWithType.map((field) => field.split(':')[0]);

          const relevantFields = await getRelevantFields();
          expect(fieldNamesWithoutType).to.eql(relevantFields.map(({ name }) => name));
          expect(fieldNamesWithType).to.eql([
            '@timestamp:date',
            '_id:_id',
            '_ignored:string',
            '_index:_index',
            '_score:number',
          ]);
        });

        it('emits a messageAdded event with the `get_alerts_dataset_info` function response', async () => {
          const eventWithDatasetInfo = messageAddedEvents.find(
            ({ message }) =>
              message.message.role === MessageRole.User &&
              message.message.name === 'get_alerts_dataset_info'
          );

          const parsedContent = JSON.parse(eventWithDatasetInfo?.message.message.content!) as {
            fields: string[];
          };

          expect(parsedContent.fields).to.eql([
            '@timestamp:date',
            '_id:_id',
            '_ignored:string',
            '_index:_index',
            '_score:number',
          ]);
        });

        it('contains the `alerts` tool', () => {
          const hasTool = thirdRequestBody.tools?.some((tool) => tool.function.name === 'alerts');

          expect(hasTool).to.be(true);
        });
      });

      describe('The fourth request', () => {
        it('contains the correct number of messages', () => {
          expect(fourthRequestBody.messages.length).to.be(8);
        });

        it('contains the `alerts` request', () => {
          const hasFunctionRequest = fourthRequestBody.messages.some(
            (message) =>
              message.role === 'assistant' && message.tool_calls?.[0]?.function?.name === 'alerts'
          );

          expect(hasFunctionRequest).to.be(true);
        });

        it('contains the `alerts` response', () => {
          const functionResponseMessage = last(fourthRequestBody.messages);
          const parsedContent = JSON.parse(functionResponseMessage?.content as string);
          expect(Object.keys(parsedContent)).to.eql(['total', 'alerts']);
        });

        it('emits a messageAdded event with the `alert` function response', async () => {
          const event = messageAddedEvents.find(
            ({ message }) =>
              message.message.role === MessageRole.User && message.message.name === 'alerts'
          );

          const parsedContent = JSON.parse(event?.message.message.content!) as {
            total: number;
            alerts: any[];
          };
          expect(parsedContent.total).to.be(1);
          expect(parsedContent.alerts.length).to.be(1);
        });
      });
    });
  });
}
