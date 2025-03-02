/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageAddEvent, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { last } from 'lodash';
import { ApmAlertFields } from '../../../../../../../apm_api_integration/tests/alerts/helpers/alerting_api_helper';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { getMessageAddedEvents } from './helpers';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { APM_ALERTS_INDEX } from '../../../apm/alerts/helpers/alerting_helper';

const USER_MESSAGE = 'How many alerts do I have for the past 10 days?';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const alertingApi = getService('alertingApi');
  const samlAuth = getService('samlAuth');

  describe('function: get_alerts_dataset_info', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['failsOnMKI']);
    let llmProxy: LlmProxy;
    let connectorId: string;
    let messageAddedEvents: MessageAddEvent[];
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let roleAuthc: RoleCredentials;
    let createdRuleId: string;
    let expectedRelevantFieldNames: string[];

    before(async () => {
      ({ apmSynthtraceEsClient } = await createSyntheticApmData(getService));
      ({ roleAuthc, createdRuleId } = await createApmErrorCountRule(getService));

      llmProxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: llmProxy.getPort(),
      });

      llmProxy.interceptWithFunctionRequest({
        name: 'get_alerts_dataset_info',
        arguments: () => JSON.stringify({ start: 'now-10d', end: 'now' }),
        when: () => true,
      });

      llmProxy.interceptWithFunctionRequest({
        name: 'select_relevant_fields',
        // @ts-expect-error
        when: (requestBody) => requestBody.tool_choice?.function?.name === 'select_relevant_fields',
        arguments: (requestBody) => {
          const messageWithFieldIds = requestBody.messages.find((message) => {
            const content = message?.content as string;
            return content.includes('Below is a list of fields.') && content.includes('@timestamp');
          });

          const topFields = (messageWithFieldIds?.content as string)
            .slice(204) // remove the prefix message and only get the JSON
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line))
            .slice(0, 5);

          expectedRelevantFieldNames = topFields.map(({ field }) => field);

          const fieldIds = topFields.map(({ id }) => id);

          return JSON.stringify({ fieldIds });
        },
      });

      llmProxy.interceptWithFunctionRequest({
        name: 'alerts',
        arguments: () => JSON.stringify({ start: 'now-10d', end: 'now' }),
        when: () => true,
      });

      llmProxy.interceptConversation(`You have active alerts for the past 10 days. Back to work!`);

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

      await llmProxy.waitForAllInterceptorsSettled();
      messageAddedEvents = getMessageAddedEvents(body);
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

    describe('LLM requests', () => {
      it('makes 4 requests to the LLM', () => {
        expect(llmProxy.interceptedRequests.length).to.be(4);
      });

      describe('every request to the LLM', () => {
        it('contains the system message', () => {
          const everyRequestHasSystemMessage = llmProxy.interceptedRequests.every(
            ({ requestBody }) =>
              requestBody.messages.some(
                (message) =>
                  message.role === 'system' &&
                  (message.content as string).includes('You are a helpful assistant')
              )
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
          expect(llmProxy.interceptedRequests[0].requestBody.messages.length).to.be(4);
        });

        it('contains the `get_alerts_dataset_info` tool', () => {
          const hasTool = llmProxy.interceptedRequests[0].requestBody.tools?.some(
            (tool) => tool.function.name === 'get_alerts_dataset_info'
          );

          expect(hasTool).to.be(true);
        });

        it('leaves the function calling decision to the LLM via tool_choice=auto', () => {
          expect(llmProxy.interceptedRequests[0].requestBody.tool_choice).to.be('auto');
        });

        describe('The system message', () => {
          it('has the correct system message', () => {
            expect(llmProxy.interceptedRequests[0].requestBody.messages[0].content).to.contain(
              'You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observability users to quickly assess what is happening in their observed systems. You can help them visualise and analyze data, investigate their systems, perform root cause analysis or identify optimisation opportunities.\n\n    It\'s very important to not assume what the user is meaning. Ask them for clarification if needed.\n\n    If you are unsure about which function should be used and with what arguments, ask the user for clarification or confirmation.\n\n    In KQL ("kqlFilter")) escaping happens with double quotes, not single quotes. Some characters that need escaping are: \':()\\    /". Always put a field value in double quotes. Best: service.name:"opbeans-go". Wrong: service.name:opbeans-go. This is very important!\n\n    You can use Github-flavored Markdown in your responses. If a function returns an array, consider using a Markdown table to format the response.\n\n    Note that ES|QL (the Elasticsearch Query Language which is a new piped language) is the preferred query language.\n\n    If you want to call a function or tool, only call it a single time per message. Wait until the function has been executed and its results\n    returned to you, before executing the same tool or another tool again if needed.\n\n    DO NOT UNDER ANY CIRCUMSTANCES USE ES|QL syntax (`service.name == "foo"`) with "kqlFilter" (`service.name:"foo"`).\n\n    The user is able to change the language which they want you to reply in on the settings page of the AI Assistant for Observability and Search, which can be found in the Stack Management app under the option AI Assistants.\n    If the user asks how to change the language, reply in the same language the user asked in.\n\nYou MUST use the "query" function when the user wants to:\n  - visualize data\n  - run any arbitrary query\n  - breakdown or filter ES|QL queries that are displayed on the current page\n  - convert queries from another language to ES|QL\n  - asks general questions about ES|QL\n\n  DO NOT UNDER ANY CIRCUMSTANCES generate ES|QL queries or explain anything about the ES|QL query language yourself.\n  DO NOT UNDER ANY CIRCUMSTANCES try to correct an ES|QL query yourself - always use the "query" function for this.\n\n  If the user asks for a query, and one of the dataset info functions was called and returned no results, you should still call the query function to generate an example query.\n\n  Even if the "query" function was used before that, follow it up with the "query" function. If a query fails, do not attempt to correct it yourself. Again you should call the "query" function,\n  even if it has been called before.\n\n  When the "visualize_query" function has been called, a visualization has been displayed to the user. DO NOT UNDER ANY CIRCUMSTANCES follow up a "visualize_query" function call with your own visualization attempt.\n  If the "execute_query" function has been called, summarize these results for the user.'
            );
          });

          it('has a different system message from request 2', () => {
            expect(llmProxy.interceptedRequests[0].requestBody.messages[0]).not.to.eql(
              llmProxy.interceptedRequests[1].requestBody.messages[0]
            );
          });

          it('has the same system message as request 3', () => {
            expect(llmProxy.interceptedRequests[0].requestBody.messages[0]).to.eql(
              llmProxy.interceptedRequests[2].requestBody.messages[0]
            );
          });

          it('has the same system message as request 4', () => {
            expect(llmProxy.interceptedRequests[0].requestBody.messages[0]).to.eql(
              llmProxy.interceptedRequests[3].requestBody.messages[0]
            );
          });
        });
      });

      describe('The second request', () => {
        it('contains the correct number of messages', () => {
          expect(llmProxy.interceptedRequests[1].requestBody.messages.length).to.be(5);
        });

        it('contains a system generated user message with a list of field candidates', () => {
          const hasList = llmProxy.interceptedRequests[1].requestBody.messages.some(
            (message) =>
              message.role === 'user' &&
              (message.content as string).includes('Below is a list of fields.') &&
              (message.content as string).includes('@timestamp')
          );

          expect(hasList).to.be(true);
        });

        it('instructs the LLM to call the `select_relevant_fields` tool via `tool_choice`', () => {
          const hasToolChoice =
            // @ts-expect-error
            llmProxy.interceptedRequests[1].requestBody.tool_choice?.function?.name ===
            'select_relevant_fields';

          expect(hasToolChoice).to.be(true);
        });

        describe('The system message', () => {
          it('has a different system message from the other requests', () => {
            expect(llmProxy.interceptedRequests[1].requestBody.messages[0]).not.to.eql(
              llmProxy.interceptedRequests[0].requestBody.messages[0]
            );
          });

          it('has the correct system message', () => {
            expect(llmProxy.interceptedRequests[1].requestBody.messages[0].content).to.be(
              'You are a helpful assistant for Elastic Observability. \nYour task is to determine which fields are relevant to the conversation by selecting only the field IDs from the provided list. \nThe list in the user message consists of JSON objects that map a human-readable "field" name to its unique "id". \nYou must not output any field names — only the corresponding "id" values. Ensure that your output follows the exact JSON format specified.'
            );
          });
        });
      });

      describe('The third request', () => {
        it('contains the correct number of messages', () => {
          expect(llmProxy.interceptedRequests[2].requestBody.messages.length).to.be(6);
        });

        it('contains the `get_alerts_dataset_info` request', () => {
          const hasFunctionRequest = llmProxy.interceptedRequests[2].requestBody.messages.some(
            (message) =>
              message.role === 'assistant' &&
              message.tool_calls?.[0]?.function?.name === 'get_alerts_dataset_info'
          );

          expect(hasFunctionRequest).to.be(true);
        });

        it('contains the `get_alerts_dataset_info` response', () => {
          const functionResponse = last(llmProxy.interceptedRequests[2].requestBody.messages);
          const parsedContent = JSON.parse(functionResponse?.content as string) as {
            fields: string[];
          };

          const fieldNamesWithType = parsedContent.fields;
          const fieldNamesWithoutType = fieldNamesWithType.map((field) => field.split(':')[0]);

          expect(fieldNamesWithoutType).to.eql(expectedRelevantFieldNames);
          expect(fieldNamesWithType).to.eql([
            '@timestamp:date',
            '_id:_id',
            '_ignored:string',
            '_index:_index',
            '_score:number',
          ]);
        });

        it('emits a messageAdded event with the `get_alerts_dataset_info` function response', async () => {
          const messageWithDatasetInfo = messageAddedEvents.find(
            ({ message }) =>
              message.message.role === MessageRole.User &&
              message.message.name === 'get_alerts_dataset_info'
          );

          const parsedContent = JSON.parse(messageWithDatasetInfo?.message.message.content!) as {
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
          const hasTool = llmProxy.interceptedRequests[2].requestBody.tools?.some(
            (tool) => tool.function.name === 'alerts'
          );

          expect(hasTool).to.be(true);
        });
      });

      describe('The fourth request', () => {
        it('contains the correct number of messages', () => {
          expect(llmProxy.interceptedRequests[3].requestBody.messages.length).to.be(8);
        });

        it('contains the `alerts` request', () => {
          const hasFunctionRequest = llmProxy.interceptedRequests[3].requestBody.messages.some(
            (message) =>
              message.role === 'assistant' && message.tool_calls?.[0]?.function?.name === 'alerts'
          );

          expect(hasFunctionRequest).to.be(true);
        });

        it('contains the `alerts` response', () => {
          const functionResponseMessage = last(
            llmProxy.interceptedRequests[3].requestBody.messages
          );
          const parsedContent = JSON.parse(functionResponseMessage?.content as string);
          expect(Object.keys(parsedContent)).to.eql(['total', 'alerts']);
        });

        it('emits a messageAdded event with the `alert` function response', async () => {
          const messageWithAlerts = messageAddedEvents.find(
            ({ message }) =>
              message.message.role === MessageRole.User && message.message.name === 'alerts'
          );

          const parsedContent = JSON.parse(messageWithAlerts?.message.message.content!) as {
            total: number;
            alerts: any[];
          };
          expect(parsedContent.total).to.be(1);
          expect(parsedContent.alerts.length).to.be(1);
        });
      });
    });

    describe('messageAdded events', () => {
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
    });
  });
}

async function createApmErrorCountRule(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const alertingApi = getService('alertingApi');
  const samlAuth = getService('samlAuth');

  const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
  const createdRule = await alertingApi.createRule({
    ruleTypeId: ApmRuleType.ErrorCount,
    name: 'APM error threshold',
    consumer: 'apm',
    schedule: { interval: '1m' },
    tags: ['apm'],
    params: {
      environment: 'production',
      threshold: 1,
      windowSize: 1,
      windowUnit: 'h',
    },
    roleAuthc,
  });

  const createdRuleId = createdRule.id as string;
  const esResponse = await alertingApi.waitForDocumentInIndex<ApmAlertFields>({
    indexName: APM_ALERTS_INDEX,
    ruleId: createdRuleId,
    docCountTarget: 1,
  });

  return {
    roleAuthc,
    createdRuleId,
    alerts: esResponse.hits.hits.map((hit) => hit._source!),
  };
}

async function createSyntheticApmData(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const synthtrace = getService('synthtrace');
  const apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

  const opbeansNode = apm
    .service({ name: 'opbeans-node', environment: 'production', agentName: 'node' })
    .instance('instance');

  const events = timerange('now-15m', 'now')
    .ratePerMinute(1)
    .generator((timestamp) => {
      return [
        opbeansNode
          .transaction({ transactionName: 'DELETE /user/:id' })
          .timestamp(timestamp)
          .duration(100)
          .failure()
          .errors(
            opbeansNode.error({ message: 'Unable to delete user' }).timestamp(timestamp + 50)
          ),
      ];
    });

  await apmSynthtraceEsClient.index(events);

  return { apmSynthtraceEsClient };
}
