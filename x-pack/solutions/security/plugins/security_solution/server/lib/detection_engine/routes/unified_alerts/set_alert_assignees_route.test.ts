/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import type { RuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';

import { DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL } from '../../../../../common/constants';
import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { setUnifiedAlertsAssigneesRoute } from './set_alert_assignees_route';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import { MAX_ALERTS_PER_TRIGGER } from '../../../../../common/workflows/triggers';

const makeSearchResponse = (
  hits: Array<{ _id: string; _index: string; _source?: Record<string, unknown> }>
): estypes.SearchResponse<unknown> => ({
  hits: {
    total: { value: hits.length, relation: 'eq' },
    max_score: null,
    hits: hits.map((h) => ({ ...h, _score: null })),
  },
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
});

const requestedIds = (params: unknown): string[] =>
  (params as { query?: { terms?: { _id?: string[] } } }).query?.terms?._id ?? [];

describe('set unified alerts assignees', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;
  let ruleDataClient: RuleDataClientMock;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse(
      getSuccessfulSignalUpdateResponse()
    );
    ruleDataClient = ruleRegistryMocks.createRuleDataClient('.alerts-security.alerts');
    mockLogger = loggingSystemMock.createLogger();

    setUnifiedAlertsAssigneesRoute(server.router, ruleDataClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('assignees on unified alerts', () => {
    test('returns 200 when setting assignees on alerts by ids', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['somefakeid1', 'somefakeid2'],
          assignees: {
            add: ['user1'],
            remove: [],
          },
        },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });

    test('updates on an index pattern with both detection and attack alerts', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['somefakeid1'],
          assignees: {
            add: ['user1'],
            remove: [],
          },
        },
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

    test('calls "esClient.updateByQuery" with ids when ids are defined', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['somefakeid1', 'somefakeid2'],
          assignees: {
            add: ['user1'],
            remove: [],
          },
        },
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
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['somefakeid1'],
          assignees: {
            add: ['user1'],
            remove: [],
          },
        },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows ids and assignees', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['somefakeid1'],
          assignees: {
            add: ['user1'],
            remove: [],
          },
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects if ids but no assignees', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['somefakeid1'],
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('rejects if assignees but no ids', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          assignees: {
            add: ['user1'],
            remove: [],
          },
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });

  describe('workflow trigger emission', () => {
    let mockEventBus: {
      emitAlertAssigneesChanged: jest.Mock;
      emitAttackAssigneesChanged: jest.Mock;
    };

    beforeEach(() => {
      server = serverMock.create();
      mockEventBus = {
        emitAlertAssigneesChanged: jest.fn(),
        emitAttackAssigneesChanged: jest.fn(),
      };
      setUnifiedAlertsAssigneesRoute(
        server.router,
        ruleDataClient,
        mockLogger,
        mockEventBus as unknown as SecuritySolutionEventBus
      );
    });

    test('emits alertAssigneesChanged for detection alert documents', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          { _id: 'alert-1', _index: '.alerts-security.alerts-default' },
          { _id: 'alert-2', _index: '.alerts-security.alerts-default' },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['alert-1', 'alert-2'],
          assignees: { add: ['user-1'], remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          alertIds: ['alert-1', 'alert-2'],
          assigneesToAdd: ['user-1'],
          assigneesToRemove: [],
          truncated: false,
        })
      );
      expect(mockEventBus.emitAttackAssigneesChanged).not.toHaveBeenCalled();
    });

    test('emits attackAssigneesChanged for attack discovery documents', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          { _id: 'attack-1', _index: '.alerts-security.attack.discovery.alerts-default' },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['attack-1'],
          assignees: { add: ['user-1'], remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          attackIds: ['attack-1'],
          assigneesToAdd: ['user-1'],
          assigneesToRemove: [],
          truncated: false,
        })
      );
      expect(mockEventBus.emitAlertAssigneesChanged).not.toHaveBeenCalled();
    });

    test('emits both events for a mixed batch of detection and attack discovery documents', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          { _id: 'alert-1', _index: '.alerts-security.alerts-default' },
          { _id: 'attack-1', _index: '.alerts-security.attack.discovery.alerts-default' },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['alert-1', 'attack-1'],
          assignees: { add: ['user-1'], remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['alert-1'] })
      );
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['attack-1'] })
      );
    });

    test('does not emit either event when prefetch throws', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockRejectedValue(
        new Error('ES error')
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['alert-1'],
          assignees: { add: ['user-1'], remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).not.toHaveBeenCalled();
      expect(mockEventBus.emitAttackAssigneesChanged).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to pre-fetch alert indices for workflow trigger (assignees)'
        )
      );
    });

    test('does not emit when validation fails', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['alert-1'],
          assignees: { add: ['user-1'], remove: ['user-1'] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).not.toHaveBeenCalled();
      expect(mockEventBus.emitAttackAssigneesChanged).not.toHaveBeenCalled();
    });

    test('chunks an oversized batch so every id is classified without exceeding the result window', async () => {
      const oversizedIds = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 1 }, (_, i) => `id-${i}`);
      // Only id-0 exists. The chunk size is derived from the number of index families in
      // the unified pattern, so assert on coverage and window size rather than call count.
      context.core.elasticsearch.client.asCurrentUser.search.mockImplementation(async (params) => {
        const chunk = requestedIds(params);
        return makeSearchResponse(
          chunk.includes(oversizedIds[0])
            ? [{ _id: oversizedIds[0], _index: '.alerts-security.alerts-default' }]
            : []
        );
      });
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: oversizedIds,
          assignees: { add: ['user-1'], remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      const searchCalls = context.core.elasticsearch.client.asCurrentUser.search.mock.calls;
      expect(searchCalls.length).toBeGreaterThan(1);
      // No chunk may ask for more hits than index.max_result_window allows...
      for (const [params] of searchCalls) {
        expect((params as { size?: number }).size).toBeLessThanOrEqual(MAX_ALERTS_PER_TRIGGER);
      }
      // ...and together the chunks must still cover every requested id.
      expect(searchCalls.flatMap(([params]) => requestedIds(params)).sort()).toEqual(
        [...oversizedIds].sort()
      );
      // Only id-0 was found; truncated is false because alertIds.length (1) <= MAX_ALERTS_PER_TRIGGER
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: [oversizedIds[0]], truncated: false })
      );
    });

    test('emits an id once per family when it exists in both attack discovery indices', async () => {
      // The prefetch keeps one hit per (id, index) to survive cross-index _id collisions.
      // Emitting the same attack twice would make a workflow process it repeatedly, and
      // enough duplicates could consume the payload cap and push out unique IDs.
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        makeSearchResponse([
          { _id: 'shared-attack', _index: '.alerts-security.attack.discovery.alerts-default' },
          {
            _id: 'shared-attack',
            _index: '.adhoc.alerts-security.attack.discovery.alerts-default',
          },
          { _id: 'other-attack', _index: '.alerts-security.attack.discovery.alerts-default' },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['shared-attack', 'other-attack'],
          assignees: { add: ['user-1'], remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['shared-attack', 'other-attack'] })
      );
      expect(mockEventBus.emitAlertAssigneesChanged).not.toHaveBeenCalled();
    });

    test('emits both triggers when the same _id exists in both detection and attack discovery indices', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        makeSearchResponse([
          { _id: 'shared-id', _index: '.alerts-security.alerts-default' },
          { _id: 'shared-id', _index: '.alerts-security.attack.discovery.alerts-default' },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['shared-id'],
          assignees: { add: ['user-1'], remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['shared-id'] })
      );
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['shared-id'] })
      );
    });

    test('does not emit for documents where the assignees operation is a no-op', async () => {
      // Both docs already have 'user-1'; removing a uid not present → no change for either doc.
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        makeSearchResponse([
          {
            _id: 'alert-1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_assignee_ids': ['user-1'] },
          },
          {
            _id: 'attack-1',
            _index: '.alerts-security.attack.discovery.alerts-default',
            _source: { 'kibana.alert.workflow_assignee_ids': ['user-1'] },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['alert-1', 'attack-1'],
          assignees: { add: ['user-1'], remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).not.toHaveBeenCalled();
      expect(mockEventBus.emitAttackAssigneesChanged).not.toHaveBeenCalled();
    });

    test('emits only for documents where the assignees operation would change something', async () => {
      // alert-1 already has 'user-1' → no change. alert-2 does not → change.
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        makeSearchResponse([
          {
            _id: 'alert-1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_assignee_ids': ['user-1'] },
          },
          {
            _id: 'alert-2',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_assignee_ids': [] },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['alert-1', 'alert-2'],
          assignees: { add: ['user-1'], remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['alert-2'] })
      );
    });

    test('emits when only a UID beyond the payload cap (position 101) would change a document', async () => {
      // First 100 UIDs are already present; UID at position 101 is new → should still emit.
      const existingUids = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      const uidsToAdd = [...existingUids, 'user-new-101'];
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        makeSearchResponse([
          {
            _id: 'alert-1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_assignee_ids': existingUids },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['alert-1'],
          assignees: { add: uidsToAdd, remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['alert-1'] })
      );
    });

    test('sets truncated=true when assignees.add exceeds MAX_ASSIGNEES_PER_OPERATION', async () => {
      const uidsToAdd = Array.from({ length: 101 }, (_, i) => `user-${i}`);
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        makeSearchResponse([
          {
            _id: 'alert-1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_assignee_ids': [] },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        body: {
          ids: ['alert-1'],
          assignees: { add: uidsToAdd, remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ truncated: true })
      );
    });
  });
});
