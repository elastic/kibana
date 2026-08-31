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

import { DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL } from '../../../../../common/constants';
import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { setUnifiedAlertsTagsRoute } from './set_alert_tags_route';
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

describe('set unified alerts tags', () => {
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

    setUnifiedAlertsTagsRoute(server.router, ruleDataClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('tags on unified alerts', () => {
    test('returns 200 when setting tags on alerts by ids', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1', 'somefakeid2'],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });

    test('updates on an index pattern with both detection and attack alerts', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1'],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
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
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1', 'somefakeid2'],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
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
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1'],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
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
    test('allows ids and tags', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1'],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects if ids but no tags', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1'],
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('rejects if tags but no ids', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('rejects empty ids array', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: [],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });

  describe('workflow trigger emission', () => {
    let mockEventBus: { emitAlertTagsChanged: jest.Mock; emitAttackTagsChanged: jest.Mock };

    beforeEach(() => {
      server = serverMock.create();
      mockEventBus = { emitAlertTagsChanged: jest.fn(), emitAttackTagsChanged: jest.fn() };
      setUnifiedAlertsTagsRoute(
        server.router,
        ruleDataClient,
        mockLogger,
        mockEventBus as unknown as SecuritySolutionEventBus
      );
    });

    test('emits alertTagsChanged for detection alert documents', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          { _id: 'alert-1', _index: '.alerts-security.alerts-default' },
          { _id: 'alert-2', _index: '.alerts-security.alerts-default' },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['alert-1', 'alert-2'],
          tags: { tags_to_add: ['tag-add'], tags_to_remove: ['tag-remove'] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          alertIds: ['alert-1', 'alert-2'],
          tagsToAdd: ['tag-add'],
          tagsToRemove: ['tag-remove'],
          truncated: false,
        })
      );
      expect(mockEventBus.emitAttackTagsChanged).not.toHaveBeenCalled();
    });

    test('emits attackTagsChanged for attack discovery documents', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          { _id: 'attack-1', _index: '.alerts-security.attack.discovery.alerts-default' },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['attack-1'],
          tags: { tags_to_add: ['tag-add'], tags_to_remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          attackIds: ['attack-1'],
          tagsToAdd: ['tag-add'],
          tagsToRemove: [],
          truncated: false,
        })
      );
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
    });

    test('emits attackTagsChanged for adhoc attack discovery documents', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        makeSearchResponse([
          { _id: 'attack-1', _index: '.adhoc.alerts-security.attack.discovery.alerts-default' },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['attack-1'],
          tags: { tags_to_add: ['tag-add'], tags_to_remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['attack-1'] })
      );
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
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
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['alert-1', 'attack-1'],
          tags: { tags_to_add: ['tag-add'], tags_to_remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['alert-1'] })
      );
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
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
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['alert-1'],
          tags: { tags_to_add: ['tag-add'], tags_to_remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
      expect(mockEventBus.emitAttackTagsChanged).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to pre-fetch alert indices for workflow trigger (tags)')
      );
    });

    test('does not emit when tag validation fails', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['alert-1'],
          tags: { tags_to_add: ['dup'], tags_to_remove: ['dup'] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
      expect(mockEventBus.emitAttackTagsChanged).not.toHaveBeenCalled();
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
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: oversizedIds,
          tags: { tags_to_add: ['tag-add'], tags_to_remove: [] },
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
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: [oversizedIds[0]], truncated: false })
      );
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
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['shared-id'],
          tags: { tags_to_add: ['tag-add'], tags_to_remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['shared-id'] })
      );
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['shared-id'] })
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
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['shared-attack', 'other-attack'],
          tags: { tags_to_add: ['tag-add'], tags_to_remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['shared-attack', 'other-attack'] })
      );
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
    });

    test('does not emit for documents where the tag operation is a no-op', async () => {
      // Both docs already have 'tag-add'; neither has 'tag-remove' → no change for either doc.
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        makeSearchResponse([
          {
            _id: 'alert-1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_tags': ['tag-add'] },
          },
          {
            _id: 'attack-1',
            _index: '.alerts-security.attack.discovery.alerts-default',
            _source: { 'kibana.alert.workflow_tags': ['tag-add'] },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['alert-1', 'attack-1'],
          tags: { tags_to_add: ['tag-add'], tags_to_remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
      expect(mockEventBus.emitAttackTagsChanged).not.toHaveBeenCalled();
    });

    test('emits only for documents where the tag operation would change something', async () => {
      // alert-1 already has 'tag-add' → no change. alert-2 does not → change.
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        makeSearchResponse([
          {
            _id: 'alert-1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_tags': ['tag-add'] },
          },
          {
            _id: 'alert-2',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_tags': [] },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['alert-1', 'alert-2'],
          tags: { tags_to_add: ['tag-add'], tags_to_remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['alert-2'] })
      );
    });

    test('emits when only a tag beyond the payload cap (position 101) would change a document', async () => {
      // First 100 tags are already present; tag at position 101 is new → should still emit.
      const existingTags = Array.from(
        { length: MAX_ALERTS_PER_TRIGGER },
        (_, i) => `tag-${i}`
      ).slice(0, 100);
      const tagsToAdd = [...existingTags, 'tag-new-101'];
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        makeSearchResponse([
          {
            _id: 'alert-1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_tags': existingTags },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['alert-1'],
          tags: { tags_to_add: tagsToAdd, tags_to_remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['alert-1'] })
      );
    });

    test('sets truncated=true when tags_to_add exceeds MAX_TAGS_PER_OPERATION', async () => {
      const tagsToAdd = Array.from({ length: 101 }, (_, i) => `tag-${i}`);
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        makeSearchResponse([
          {
            _id: 'alert-1',
            _index: '.alerts-security.alerts-default',
            _source: { 'kibana.alert.workflow_tags': [] },
          },
        ])
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['alert-1'],
          tags: { tags_to_add: tagsToAdd, tags_to_remove: [] },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ truncated: true })
      );
    });
  });
});
