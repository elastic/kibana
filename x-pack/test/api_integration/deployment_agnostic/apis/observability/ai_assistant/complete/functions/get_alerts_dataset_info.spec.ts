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
import { ChatCompletionAssistantMessageParam } from 'openai/resources';
import { ApmAlertFields } from '../../../../../../../apm_api_integration/tests/alerts/helpers/alerting_api_helper';
import {
  LlmProxy,
  createLlmProxy,
} from '../../../../../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { getMessageAddedEvents } from './helpers';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { APM_ALERTS_INDEX } from '../../../apm/alerts/helpers/alerting_helper';

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

      llmProxy.interceptConversation(
        {
          content: '',
          tool_calls: [
            {
              function: {
                name: 'get_alerts_dataset_info',
                arguments: JSON.stringify({ start: 'now-10d', end: 'now' }),
              },
              index: 0,
              // @ts-expect-error
              id: 'call_hFHMH5idQKW5qtoGOsmEChGE',
            },
          ],
        },
        {
          name: 'Function request: "get_alerts_dataset_info"',
        }
      );

      llmProxy.interceptToolChoice({
        toolName: 'select_relevant_fields',
        toolArguments: (requestBody) => {
          const messageWithFieldIds = requestBody.messages.find((message) => {
            const content = message?.content as string;
            return content.includes('This is the list:') && content.includes('@timestamp');
          });

          const topFields = (messageWithFieldIds?.content as string)
            .replace('This is the list:', '')
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line))
            .slice(0, 5);

          expectedRelevantFieldNames = topFields.map(({ field }) => field);

          const fieldIds = topFields.map(({ id }) => id);

          return JSON.stringify({ fieldIds });
        },
      });

      llmProxy.interceptConversation(
        {
          content: '',
          tool_calls: [
            {
              function: {
                name: 'alerts',
                arguments: JSON.stringify({ start: 'now-10d', end: 'now' }),
              },
              index: 0,
              // @ts-expect-error
              id: 'call_asPqcc7PZvH3h645wP34CX5J',
            },
          ],
        },
        {
          name: 'Function request: alerts',
        }
      );

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
                  content: 'How many alerts do I have for the past 10 days?',
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

    it('sends correct ES fields', async () => {
      const messageWithFields = messageAddedEvents.find(
        ({ message }) =>
          message.message.role === MessageRole.User &&
          message.message.name === 'get_alerts_dataset_info'
      );

      const parsedContent = JSON.parse(messageWithFields?.message.message.content!) as {
        fields: string[];
      };
      const fieldNames = parsedContent.fields.map((field) => field.split(':')[0]);

      expect(fieldNames).to.eql(expectedRelevantFieldNames);
      expect(parsedContent.fields).to.eql([
        '@timestamp:date',
        '_id:_id',
        '_ignored:string',
        '_index:_index',
        '_score:number',
      ]);
    });

    it('sends alerts for the given period', async () => {
      const messageWithAlerts = messageAddedEvents.find(
        ({ message }) =>
          message.message.role === MessageRole.User && message.message.name === 'alerts'
      );

      const parsedContent = JSON.parse(messageWithAlerts?.message.message.content!) as {
        total: number;
        alerts: any[];
      };
      expect(parsedContent.total).to.above(0);
      // expect(parsedContent.alerts).to.eql();
    });

    it('sends messageAdded events in the correct order', async () => {
      expect(
        messageAddedEvents.map(({ message }) => {
          const { role, name, function_call: functionCall } = message.message;
          if (functionCall) {
            return { function_call: functionCall, role };
          }

          return { name, role };
        })
      ).to.eql([
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

    it('makes the right requests to the LLM proxy', async () => {
      expect(llmProxy.interceptedRequests.length).to.eql(4);

      const actualRequests = llmProxy.interceptedRequests.map(({ requestBody }) => {
        const messages = requestBody.messages.map((message) => {
          const {
            role,
            content,
            tool_calls: toolCalls,
          } = message as ChatCompletionAssistantMessageParam;

          let formattedContent = '';
          if (content) {
            // @ts-expect-error
            formattedContent = content?.includes('This is the list:')
              ? 'This is the list:'
              : content;

            formattedContent =
              formattedContent.length > 100
                ? `${formattedContent.slice(0, 100)}...`
                : formattedContent;
          }

          return {
            role,
            content: formattedContent,
            ...(toolCalls ? { tool_calls: toolCalls[0].function } : {}),
          };
        });

        return {
          messages,
          toolChoice: requestBody.tool_choice,
        };
      });

      expect(actualRequests).to.eql([
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observabilit...',
            },
            {
              role: 'user',
              content: 'How many alerts do I have for the past 10 days?',
            },
            {
              role: 'assistant',
              content: '',
              tool_calls: {
                name: 'context',
                arguments: '{}',
              },
            },
            {
              role: 'tool',
              content: '{"screen_description":"","learnings":[]}',
            },
          ],
          toolChoice: 'auto',
        },
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observabilit...',
            },
            {
              role: 'user',
              content: 'How many alerts do I have for the past 10 days?',
            },
            {
              role: 'assistant',
              content: '',
              tool_calls: {
                name: 'context',
                arguments: '{}',
              },
            },
            {
              role: 'tool',
              content: '{"screen_description":"","learnings":[]}',
            },
            {
              role: 'user',
              content: 'This is the list:',
            },
          ],
          toolChoice: {
            function: {
              name: 'select_relevant_fields',
            },
            type: 'function',
          },
        },
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observabilit...',
            },
            {
              role: 'user',
              content: 'How many alerts do I have for the past 10 days?',
            },
            {
              role: 'assistant',
              content: '',
              tool_calls: {
                name: 'context',
                arguments: '{}',
              },
            },
            {
              role: 'tool',
              content: '{"screen_description":"","learnings":[]}',
            },
            {
              role: 'assistant',
              content: '',
              tool_calls: {
                name: 'get_alerts_dataset_info',
                arguments: '{"start":"now-10d","end":"now"}',
              },
            },
            {
              role: 'tool',
              content:
                '{"fields":["@timestamp:date","_id:_id","_ignored:string","_index:_index","_score:number"]}',
            },
          ],
          toolChoice: 'auto',
        },
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observabilit...',
            },
            {
              role: 'user',
              content: 'How many alerts do I have for the past 10 days?',
            },
            {
              role: 'assistant',
              content: '',
              tool_calls: {
                name: 'context',
                arguments: '{}',
              },
            },
            {
              role: 'tool',
              content: '{"screen_description":"","learnings":[]}',
            },
            {
              role: 'assistant',
              content: '',
              tool_calls: {
                name: 'get_alerts_dataset_info',
                arguments: '{"start":"now-10d","end":"now"}',
              },
            },
            {
              role: 'tool',
              content:
                '{"fields":["@timestamp:date","_id:_id","_ignored:string","_index:_index","_score:number"]}',
            },
            {
              role: 'assistant',
              content: '',
              tool_calls: {
                name: 'alerts',
                arguments: '{"start":"now-10d","end":"now"}',
              },
            },
            {
              role: 'tool',
              content:
                '{"total":1,"alerts":[{"processor.event":"error","kibana.alert.evaluation.value":15,"kibana.alert.eva...',
            },
          ],
          toolChoice: 'auto',
        },
      ]);
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
