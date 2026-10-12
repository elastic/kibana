/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import type { RuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';
import type { estypes } from '@elastic/elasticsearch';

import { DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL } from '../../../../../common/constants';
import { MAX_ALERTS_PER_TRIGGER } from '../../../../../common/workflows/triggers';
import {
  typicalSetStatusSignalByIdsPayload,
  getSuccessfulSignalUpdateResponse,
} from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { setUnifiedAlertsWorkflowStatusRoute } from './set_workflow_status_route';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';

const makeSearchResponse = (
  hits: Array<{ _id: string; _index: string; _source?: Record<string, unknown> }>
): estypes.SearchResponse<unknown> => ({
  hits: {
    hits: hits.map((h) => ({ ...h, _score: 1 })),
    total: { value: hits.length, relation: 'eq' },
    max_score: 1,
  },
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
});

const requestedIds = (params: unknown): string[] =>
  (params as { query?: { ids?: { values?: string[] } } }).query?.ids?.values ?? [];

describe('set unified alerts workflow status', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;
  let ruleDataClient: RuleDataClientMock;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  // Answers each prefetch chunk with the ids that chunk actually asked for, so overflow
  // tests assert on the emitted payload instead of hard-coding an internal chunk size
  // (which is derived from the number of index families in the unified pattern).
  const mockChunkedSearch = (sourceForId: (id: string) => Record<string, unknown> | undefined) =>
    context.core.elasticsearch.client.asCurrentUser.search.mockImplementation(async (params) =>
      makeSearchResponse(
        requestedIds(params).flatMap((id) => {
          const source = sourceForId(id);
          return source === undefined
            ? []
            : [{ _id: id, _index: '.alerts-security.alerts-default', _source: source }];
        })
      )
    );

  const requestedIdsAcrossSearches = (): string[] =>
    context.core.elasticsearch.client.asCurrentUser.search.mock.calls.flatMap(([params]) =>
      requestedIds(params)
    );

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
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          {
            _id: 'somefakeid1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
          {
            _id: 'somefakeid2',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'acknowledged' },
          },
        ])
      );
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
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          {
            _id: 'somefakeid1',
            _index: '.alerts-security.attack.discovery.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
          {
            _id: 'somefakeid2',
            _index: '.adhoc.alerts-security.attack.discovery.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'acknowledged' },
          },
        ])
      );
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

    test('emits attackStatusChanged when _index is the concrete backing index (.internal.* prefix)', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          {
            _id: 'somefakeid1',
            _index: '.internal.alerts-security.attack.discovery.alerts-default-000001',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
        ])
      );
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
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          {
            _id: 'somefakeid1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
          {
            _id: 'somefakeid2',
            _index: '.alerts-security.attack.discovery.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'acknowledged' },
          },
        ])
      );
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
      context.core.elasticsearch.client.asCurrentUser.search.mockRejectedValue(
        new Error('ES error')
      );
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
        expect.stringContaining('Failed to pre-fetch previous alert statuses for workflow trigger')
      );
    });

    test('does not emit when all alerts already have the requested status', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          {
            _id: 'somefakeid1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'closed' },
          },
          {
            _id: 'somefakeid2',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'closed' },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(), // status: 'closed'
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertStatusChanged).not.toHaveBeenCalled();
      expect(mockEventBus.emitAttackStatusChanged).not.toHaveBeenCalled();
    });

    test('chunks an oversized batch so every id is prefetched without exceeding the result window', async () => {
      const oversizedIds = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 1 }, (_, i) => `id-${i}`);
      // Only id-0 exists. The chunk size is derived from the number of index families in
      // the unified pattern, so assert on coverage and window size rather than call count.
      mockChunkedSearch((id) =>
        id === oversizedIds[0] ? { 'kibana.alert.workflow_status': 'open' } : undefined
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: { signal_ids: oversizedIds, status: 'acknowledged' },
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
      expect(requestedIdsAcrossSearches().sort()).toEqual([...oversizedIds].sort());

      // Only id-0 was actually found; truncated is false because alertIds.length (1) <= MAX_ALERTS_PER_TRIGGER
      expect(mockEventBus.emitAlertStatusChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: [oversizedIds[0]], truncated: false })
      );
    });

    test('emits both triggers when the same _id exists in both detection and attack discovery indices', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          {
            _id: 'shared-id',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
          {
            _id: 'shared-id',
            _index: '.alerts-security.attack.discovery.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: { signal_ids: ['shared-id'], status: 'closed' },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertStatusChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['shared-id'] })
      );
      expect(mockEventBus.emitAttackStatusChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['shared-id'] })
      );
    });

    test('caps previousStatuses alongside alertIds when the batch overflows MAX_ALERTS_PER_TRIGGER', async () => {
      // All MAX_ALERTS_PER_TRIGGER+1 documents are changing status (open → closed), so the
      // accumulated previousStatuses overflows too and must be capped in lockstep with the IDs.
      mockChunkedSearch(() => ({ 'kibana.alert.workflow_status': 'open' }));
      const oversizedIds = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 1 }, (_, i) => `id-${i}`);
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: { signal_ids: oversizedIds, status: 'closed' },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      const emitCall = mockEventBus.emitAlertStatusChanged.mock.calls[0][1];
      expect(emitCall.truncated).toBe(true);
      expect(emitCall.alertIds).toHaveLength(MAX_ALERTS_PER_TRIGGER);
      expect(emitCall.previousStatuses).toHaveLength(MAX_ALERTS_PER_TRIGGER);
    });

    test('excludes previousStatuses entries for IDs truncated from alertIds', async () => {
      // Scenario: id-0 has unrecognized status 'triaged' (appears in alertIds but not
      // previousStatuses); every other id has recognised 'open'. id-10000 overflows the cap,
      // so without the fix previousStatuses would include {id-10000, 'open'} even though
      // id-10000 is not in the emitted alertIds.
      mockChunkedSearch((id) => ({
        'kibana.alert.workflow_status': id === 'id-0' ? 'triaged' : 'open',
      }));
      const oversizedIds = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 1 }, (_, i) => `id-${i}`);
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: { signal_ids: oversizedIds, status: 'closed' },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      const emitCall = mockEventBus.emitAlertStatusChanged.mock.calls[0][1];
      expect(emitCall.alertIds).toHaveLength(MAX_ALERTS_PER_TRIGGER);
      // id-0 is in alertIds (unrecognised status → changing) but has no previousStatuses entry.
      // id-10000 is NOT in alertIds (truncated) so must also be absent from previousStatuses.
      expect(
        emitCall.previousStatuses.find(
          (ps: { id: string }) => ps.id === `id-${MAX_ALERTS_PER_TRIGGER}`
        )
      ).toBeUndefined();
      // previousStatuses should only contain entries for id-1..id-9999 (9999 entries).
      expect(emitCall.previousStatuses).toHaveLength(MAX_ALERTS_PER_TRIGGER - 1);
    });

    test('does not emit when all IDs are already at the target status across multiple chunks', async () => {
      const oversizedIds = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 1 }, (_, i) => `id-${i}`);
      // chunkSize = 5000, so 3 chunks. First chunk: id-0 already at target; others return nothing.
      context.core.elasticsearch.client.asCurrentUser.search
        .mockResolvedValueOnce(
          makeSearchResponse([
            {
              _id: oversizedIds[0],
              _index: '.alerts-security.alerts-default',
              _source: { 'kibana.alert.workflow_status': 'closed' }, // already at target
            },
          ])
        )
        .mockResolvedValueOnce(makeSearchResponse([]))
        .mockResolvedValueOnce(makeSearchResponse([]));
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: { signal_ids: oversizedIds, status: 'closed' },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));

      // id-0 is already at target status (no-op), nothing else was found → no emit
      expect(mockEventBus.emitAlertStatusChanged).not.toHaveBeenCalled();
      expect(mockEventBus.emitAttackStatusChanged).not.toHaveBeenCalled();
    });

    test('does not emit for docs that have no status field (script cannot mutate them)', async () => {
      // A doc with no kibana.alert.workflow_status and no signal.status won't be updated
      // by the Painless script (both guards check != null), so it must not trigger an event.
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          {
            _id: 'no-status-doc',
            _index: '.alerts-security.alerts-default',
            _source: {}, // no status fields at all
          },
          {
            _id: 'has-status-doc',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_status': 'open' },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        body: typicalSetStatusSignalByIdsPayload(), // status: 'closed'
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));

      const call = (mockEventBus.emitAlertStatusChanged as jest.Mock).mock.calls[0][1];
      expect(call.alertIds).not.toContain('no-status-doc');
      expect(call.alertIds).toContain('has-status-doc');
    });
  });
});
