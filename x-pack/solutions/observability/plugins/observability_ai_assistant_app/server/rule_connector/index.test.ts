/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertHit } from '@kbn/alerting-plugin/server/types';
import { ObservabilityAIAssistantRouteHandlerResources } from '@kbn/observability-ai-assistant-plugin/server/routes/types';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID } from '../../common/rule_connector';
import { ALERT_STATUSES } from '../../common/constants';
import {
  getObsAIAssistantConnectorAdapter,
  getObsAIAssistantConnectorType,
  ObsAIAssistantConnectorTypeExecutorOptions,
} from '.';
import { Observable } from 'rxjs';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import { AlertDetailsContextualInsightsService } from '@kbn/observability-plugin/server/services';

const buildConversation = (contentMessage: string) => [
  {
    '@timestamp': expect.any(String),
    message: {
      role: MessageRole.System,
      content: '',
    },
  },
  {
    '@timestamp': expect.any(String),
    message: {
      role: MessageRole.User,
      content: contentMessage,
    },
  },
  {
    '@timestamp': expect.any(String),
    message: {
      role: MessageRole.Assistant,
      content: '',
      function_call: {
        name: 'get_alerts_context',
        arguments: JSON.stringify({}),
        trigger: MessageRole.Assistant as const,
      },
    },
  },
  {
    '@timestamp': expect.any(String),
    message: {
      role: MessageRole.User,
      name: 'get_alerts_context',
      content: expect.any(String),
    },
  },
  {
    '@timestamp': expect.any(String),
    message: {
      role: MessageRole.Assistant,
      content: '',
      function_call: {
        name: 'get_connectors',
        arguments: JSON.stringify({}),
        trigger: MessageRole.Assistant as const,
      },
    },
  },
  {
    '@timestamp': expect.any(String),
    message: {
      role: MessageRole.User,
      name: 'get_connectors',
      content: JSON.stringify({ connectors: [{ id: 'connector_1' }] }),
    },
  },
];

describe('observabilityAIAssistant rule_connector', () => {
  describe('getObsAIAssistantConnectorAdapter', () => {
    it('uses correct connector_id', () => {
      const adapter = getObsAIAssistantConnectorAdapter();
      expect(adapter.connectorTypeId).toEqual(OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID);
    });

    it('builds action params', () => {
      const adapter = getObsAIAssistantConnectorAdapter();
      const params = adapter.buildActionParams({
        params: { connector: '.azure', message: 'hello' },
        rule: { id: 'foo', name: 'bar', tags: [], consumer: '', producer: '' },
        ruleUrl: 'http://myrule.com',
        spaceId: 'default',
        alerts: {
          all: { count: 1, data: [] },
          new: { count: 1, data: [{ _id: 'new_alert' } as AlertHit] },
          ongoing: { count: 1, data: [] },
          recovered: { count: 1, data: [{ _id: 'recovered_alert' } as AlertHit] },
        },
      });

      expect(params).toEqual({
        connector: '.azure',
        prompts: [{ message: 'hello', statuses: ALERT_STATUSES }],
        rule: { id: 'foo', name: 'bar', tags: [], ruleUrl: 'http://myrule.com' },
        alerts: {
          new: [{ _id: 'new_alert' }],
          recovered: [{ _id: 'recovered_alert' }],
        },
      });
    });
  });

  describe('Connector Type - getObsAIAssistantConnectorType', () => {
    const completeMock = jest.fn().mockReturnValue(new Observable());

    const initResources = jest.fn().mockResolvedValue({
      service: {
        getClient: async () => ({ complete: completeMock }),
        getFunctionClient: async () => ({
          getFunctions: () => [],
          getInstructions: () => [],
          getAdhocInstructions: () => [],
        }),
      },
      context: {},
      plugins: {
        core: {
          start: () =>
            Promise.resolve({
              http: { basePath: { publicBaseUrl: 'http://kibana.com' } },
            }),
        },
        actions: {
          start: async () => {
            return {
              getActionsClientWithRequest: jest.fn().mockResolvedValue({
                async getAll() {
                  return [{ id: 'connector_1' }];
                },
              }),
            };
          },
        },
      },
    } as unknown as ObservabilityAIAssistantRouteHandlerResources);

    const adapter = getObsAIAssistantConnectorAdapter();
    const buildActionParams = (params: {
      connector: string;
      message?: string;
      prompts?: Array<{ message: string; statuses: string[] }>;
    }) => {
      return adapter.buildActionParams({
        params,
        rule: { id: 'foo', name: 'bar', tags: [], consumer: '', producer: '' },
        spaceId: 'default',
        alerts: {
          all: { count: 1, data: [] },
          new: {
            count: 1,
            data: [
              {
                '@timestamp': new Date().toISOString(),
                _id: 'new_alert',
                _index: 'alert_index',
                'kibana.alert.instance.id': 'instance_id',
                'kibana.alert.rule.category': 'rule_category',
                'kibana.alert.rule.consumer': 'rule_consumer',
                'kibana.alert.rule.name': 'rule_name',
                'kibana.alert.rule.producer': 'rule_producer',
                'kibana.alert.rule.revision': 1,
                'kibana.alert.rule.tags': [],
                'kibana.alert.rule.rule_type_id': 'rule_type_id',
                'kibana.alert.uuid': 'alert_uuid',
                'kibana.alert.rule.uuid': 'rule_uuid',
                'kibana.alert.start': new Date().toISOString(),
                'kibana.alert.status': ALERT_STATUS_ACTIVE,
                'kibana.space_ids': ['default'],
              },
            ],
          },
          ongoing: { count: 1, data: [] },
          recovered: { count: 0, data: [] },
        },
      });
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should have the correct configuration', () => {
      const connectorType = getObsAIAssistantConnectorType(
        initResources,
        new AlertDetailsContextualInsightsService()
      );
      expect(connectorType.id).toEqual(OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID);
      expect(connectorType.isSystemActionType).toEqual(true);
      expect(connectorType.minimumLicenseRequired).toEqual('enterprise');
    });

    it('should not execute when there are no new or recovered alerts', async () => {
      const connectorType = getObsAIAssistantConnectorType(
        initResources,
        new AlertDetailsContextualInsightsService()
      );
      const result = await connectorType.executor({
        actionId: 'observability-ai-assistant',
        request: getFakeKibanaRequest({ id: 'foo', api_key: 'bar' }),
        params: { alerts: { new: [], recovered: [] } },
      } as unknown as ObsAIAssistantConnectorTypeExecutorOptions);
      expect(result).toEqual({ actionId: 'observability-ai-assistant', status: 'ok' });
      expect(initResources).not.toHaveBeenCalled();
    });

    it('should call the complete API with a single message', async () => {
      const message = 'hello';
      const params = buildActionParams({ connector: 'azure-open-ai', message });
      const connectorType = getObsAIAssistantConnectorType(
        initResources,
        new AlertDetailsContextualInsightsService()
      );
      const result = await connectorType.executor({
        actionId: 'observability-ai-assistant',
        request: getFakeKibanaRequest({ id: 'foo', api_key: 'bar' }),
        params,
      } as unknown as ObsAIAssistantConnectorTypeExecutorOptions);

      expect(result).toEqual({ actionId: 'observability-ai-assistant', status: 'ok' });
      expect(initResources).toHaveBeenCalledTimes(1);
      expect(completeMock).toHaveBeenCalledTimes(1);

      expect(completeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          persist: true,
          isPublic: true,
          connectorId: 'azure-open-ai',
          kibanaPublicUrl: 'http://kibana.com',
          messages: buildConversation(message),
        })
      );
    });

    it('executes the complete API with a single prompt', async () => {
      const message = 'hello';
      const params = buildActionParams({
        connector: 'azure-open-ai',
        prompts: [{ message, statuses: ALERT_STATUSES }],
      });

      const connectorType = getObsAIAssistantConnectorType(
        initResources,
        new AlertDetailsContextualInsightsService()
      );
      const result = await connectorType.executor({
        actionId: 'observability-ai-assistant',
        request: getFakeKibanaRequest({ id: 'foo', api_key: 'bar' }),
        params,
      } as unknown as ObsAIAssistantConnectorTypeExecutorOptions);

      expect(result).toEqual({ actionId: 'observability-ai-assistant', status: 'ok' });
      expect(initResources).toHaveBeenCalledTimes(1);
      expect(completeMock).toHaveBeenCalledTimes(1);

      expect(completeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          persist: true,
          isPublic: true,
          connectorId: 'azure-open-ai',
          kibanaPublicUrl: 'http://kibana.com',
          messages: buildConversation(message),
        })
      );
    });

    it('should call the complete API with multiple prompts', async () => {
      const message = 'hello';
      const message2 = 'bye';
      const params = buildActionParams({
        connector: 'azure-open-ai',
        prompts: [
          { message, statuses: ALERT_STATUSES },
          { message: message2, statuses: ALERT_STATUSES },
        ],
      });

      const connectorType = getObsAIAssistantConnectorType(
        initResources,
        new AlertDetailsContextualInsightsService()
      );
      const result = await connectorType.executor({
        actionId: 'observability-ai-assistant',
        request: getFakeKibanaRequest({ id: 'foo', api_key: 'bar' }),
        params,
      } as unknown as ObsAIAssistantConnectorTypeExecutorOptions);

      expect(result).toEqual({ actionId: 'observability-ai-assistant', status: 'ok' });
      expect(initResources).toHaveBeenCalledTimes(1);
      expect(completeMock).toHaveBeenCalledTimes(2);

      expect(completeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          persist: true,
          isPublic: true,
          connectorId: 'azure-open-ai',
          kibanaPublicUrl: 'http://kibana.com',
          messages: buildConversation(message),
        })
      );
      expect(completeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          persist: true,
          isPublic: true,
          connectorId: 'azure-open-ai',
          kibanaPublicUrl: 'http://kibana.com',
          messages: buildConversation(message2),
        })
      );
    });
  });
});
