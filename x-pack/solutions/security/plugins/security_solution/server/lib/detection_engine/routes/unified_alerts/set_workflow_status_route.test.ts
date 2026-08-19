/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import type { RuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';

import { DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL } from '../../../../../common/constants';
import {
  typicalSetStatusSignalByIdsPayload,
  getSuccessfulSignalUpdateResponse,
} from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { setUnifiedAlertsWorkflowStatusRoute } from './set_workflow_status_route';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';

describe('set unified alerts workflow status', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;
  let ruleDataClient: RuleDataClientMock;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.core.uiSettings.client.get.mockResolvedValue([]);
    context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse(
      getSuccessfulSignalUpdateResponse()
    );
    ruleDataClient = ruleRegistryMocks.createRuleDataClient('.alerts-security.alerts');
    mockLogger = loggingSystemMock.createLogger();

    setUnifiedAlertsWorkflowStatusRoute(server.router, ruleDataClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('status on unified alerts', () => {
    test('returns 200 when setting a status on alerts by ids', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });

    test('updates on an index pattern with both detection and attack alerts', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      await server.inject(request, requestContextMock.convertContext(context));

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: [
            '.alerts-security.alerts-default',
            '.alerts-security.attack.discovery.alerts-default',
            '.adhoc.alerts-security.attack.discovery.alerts-default',
          ],
        })
      );
    });

    test('calls "esClient.updateByQuery" with signalIds when ids are defined', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      await server.inject(request, requestContextMock.convertContext(context));

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: { terms: { _id: ['somefakeid1', 'somefakeid2'] } } } },
        })
      );
    });

    test('catches error if updateByQuery throws error', async () => {
      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    test('handles closed status with reason', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: {
          signal_ids: ['somefakeid1'],
          status: 'closed',
          reason: 'false_positive',
        },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalled();
    });

    test('returns 400 when closing reason is invalid', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: {
          signal_ids: ['somefakeid1'],
          status: 'closed',
          reason: 'invalid_reason',
        },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).not.toHaveBeenCalled();
    });

    test('returns 200 when closing reason is in configured custom reasons', async () => {
      context.core.uiSettings.client.get.mockResolvedValue(['configured_custom_reason']);
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: {
          signal_ids: ['somefakeid1'],
          status: 'closed',
          reason: 'configured_custom_reason',
        },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });

    test('handles different status values', async () => {
      const statuses = ['open', 'acknowledged', 'in-progress'] as const;

      for (const status of statuses) {
        const request = requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
          body: {
            signal_ids: ['somefakeid1'],
            status,
          },
        });
        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
      }
    });
  });

  describe('request validation', () => {
    test('allows signal_ids and status', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('allows closed status with reason', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: {
          signal_ids: ['somefakeid1'],
          status: 'closed',
          reason: 'false_positive',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects if signal_ids but no status', async () => {
      const { status, ...body } = typicalSetStatusSignalByIdsPayload();
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body,
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('rejects if status but no signal_ids', async () => {
      const { signal_ids, ...body } = typicalSetStatusSignalByIdsPayload();
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body,
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('rejects empty signal_ids array', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: {
          signal_ids: [],
          status: 'open',
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });

  describe('workflow trigger emission', () => {
    let mockEventBus: { emitAlertStatusChanged: jest.Mock; emitAttackStatusChanged: jest.Mock };

    beforeEach(() => {
      server = serverMock.create();
      mockEventBus = {
        emitAlertStatusChanged: jest.fn(),
        emitAttackStatusChanged: jest.fn(),
      };
      setUnifiedAlertsWorkflowStatusRoute(
        server.router,
        ruleDataClient,
        mockLogger,
        mockEventBus as unknown as SecuritySolutionEventBus
      );
    });

    test('emits alertStatusChanged for detection alert documents', async () => {
      context.core.elasticsearch.client.asCurrentUser.mget.mockResponse({
        docs: [
          {
            found: true,
            _id: 'somefakeid1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
          {
            found: true,
            _id: 'somefakeid2',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'acknowledged' },
          },
        ],
      });
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertStatusChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          alertIds: ['somefakeid1', 'somefakeid2'],
          status: 'closed',
          truncated: false,
        })
      );
      expect(mockEventBus.emitAttackStatusChanged).not.toHaveBeenCalled();
    });

    test('emits attackStatusChanged for attack discovery documents', async () => {
      context.core.elasticsearch.client.asCurrentUser.mget.mockResponse({
        docs: [
          {
            found: true,
            _id: 'somefakeid1',
            _index: '.alerts-security.attack.discovery.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
          {
            found: true,
            _id: 'somefakeid2',
            _index: '.adhoc.alerts-security.attack.discovery.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'acknowledged' },
          },
        ],
      });
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackStatusChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          attackIds: ['somefakeid1', 'somefakeid2'],
          status: 'closed',
          truncated: false,
        })
      );
      expect(mockEventBus.emitAlertStatusChanged).not.toHaveBeenCalled();
    });

    test('emits attackStatusChanged when _index is the concrete RAC backing index (.internal.* prefix)', async () => {
      context.core.elasticsearch.client.asCurrentUser.mget.mockResponse({
        docs: [
          {
            found: true,
            _id: 'somefakeid1',
            _index: '.internal.alerts-security.attack.discovery.alerts-default-000001',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
        ],
      });
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackStatusChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['somefakeid1'], status: 'closed' })
      );
      expect(mockEventBus.emitAlertStatusChanged).not.toHaveBeenCalled();
    });

    test('emits both triggers when IDs span detection alerts and attack discovery documents', async () => {
      context.core.elasticsearch.client.asCurrentUser.mget.mockResponse({
        docs: [
          {
            found: true,
            _id: 'somefakeid1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
          {
            found: true,
            _id: 'somefakeid2',
            _index: '.alerts-security.attack.discovery.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'acknowledged' },
          },
        ],
      });
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertStatusChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['somefakeid1'], status: 'closed' })
      );
      expect(mockEventBus.emitAttackStatusChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['somefakeid2'], status: 'closed', truncated: false })
      );
    });

    test('emits nothing and logs warn when prefetch fails', async () => {
      context.core.elasticsearch.client.asCurrentUser.mget.mockRejectedValue(new Error('ES error'));
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertStatusChanged).not.toHaveBeenCalled();
      expect(mockEventBus.emitAttackStatusChanged).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to pre-fetch previous alert statuses for workflow trigger'
      );
    });
  });
});
