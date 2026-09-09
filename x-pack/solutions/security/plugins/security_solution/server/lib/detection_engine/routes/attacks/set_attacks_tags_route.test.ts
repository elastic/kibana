/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import type { RuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';

import { DETECTION_ENGINE_ATTACKS_TAGS_URL } from '../../../../../common/constants';
import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { ATTACKS_API_CALL_EVENT } from '../../../telemetry/event_based/events';
import { ATTACKS_DUPLICATE_TAGS_VALIDATION_ERROR } from './attacks_ebt_helpers';
import { createMockTelemetryEventsSender } from '../../../telemetry/__mocks__';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { setAttacksTagsRoute } from './set_attacks_tags_route';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  MAX_ALERTS_PER_TRIGGER,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_OPERATION,
} from '../../../../../common/workflows/triggers';

const SCHEDULED_INDEX = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default`;
const ADHOC_INDEX = `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-default`;
const DETECTION_ALERTS_INDEX = '.alerts-security.alerts-default';

const defaultTags = { tags_to_add: ['investigation'], tags_to_remove: [] };

const getSearchResponse = (
  hits: Array<{ _id: string; alertIds?: string[]; _index?: string }>
): estypes.SearchResponse<unknown> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: { value: hits.length, relation: 'eq' },
    max_score: 0,
    hits: hits.map(({ _id, alertIds, _index = SCHEDULED_INDEX }) => ({
      _id,
      _index,
      _source: alertIds === undefined ? {} : { [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: alertIds },
    })),
  },
});

const getRequest = (body: Record<string, unknown>) =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_ATTACKS_TAGS_URL,
    body,
  });

const defaultBody = { ids: ['attack1', 'attack2'], tags: defaultTags };

describe('set attacks tags', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;
  let ruleDataClient: RuleDataClientMock;
  let telemetrySenderMock: ITelemetryEventsSender;
  let reportEBT: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse(
      getSuccessfulSignalUpdateResponse()
    );
    ruleDataClient = ruleRegistryMocks.createRuleDataClient('.alerts-security.alerts');

    reportEBT = jest.fn();
    telemetrySenderMock = {
      ...createMockTelemetryEventsSender(),
      reportEBT,
    } as unknown as ITelemetryEventsSender;

    setAttacksTagsRoute(server.router, ruleDataClient, telemetrySenderMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('update_related_alerts: false (attacks only)', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getRequest(defaultBody),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
    });

    test('updates only the scheduled and adhoc attack indices', async () => {
      await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({ index: [SCHEDULED_INDEX, ADHOC_INDEX] })
      );
    });

    test('scopes the update to the requested ids', async () => {
      await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: { terms: { _id: ['attack1', 'attack2'] } } } },
        })
      );
    });

    test('does not pre-fetch attack docs', async () => {
      await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));

      expect(context.core.elasticsearch.client.asCurrentUser.search).not.toHaveBeenCalled();
    });
  });

  describe('update_related_alerts: true (cascade)', () => {
    beforeEach(() => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        getSearchResponse([{ _id: 'attack1', alertIds: ['alertA', 'alertB'] }])
      );
    });

    test('pre-fetches attack docs scoped to the attack indices', async () => {
      await server.inject(
        getRequest({ ...defaultBody, update_related_alerts: true }),
        requestContextMock.convertContext(context)
      );

      expect(context.core.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: `${SCHEDULED_INDEX},${ADHOC_INDEX}`,
          _source_includes: [ALERT_ATTACK_DISCOVERY_ALERT_IDS, ALERT_WORKFLOW_TAGS],
        })
      );
    });

    test('updates the unified index pattern including detection alerts', async () => {
      await server.inject(
        getRequest({ ...defaultBody, update_related_alerts: true }),
        requestContextMock.convertContext(context)
      );

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: [DETECTION_ALERTS_INDEX, SCHEDULED_INDEX, ADHOC_INDEX],
        })
      );
    });

    test('updates the union of verified attack ids and related alert ids', async () => {
      await server.inject(
        getRequest({ ...defaultBody, update_related_alerts: true }),
        requestContextMock.convertContext(context)
      );

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: { terms: { _id: ['attack1', 'alertA', 'alertB'] } } } },
        })
      );
    });

    test('excludes unknown attack ids that did not match the attack indices', async () => {
      await server.inject(
        getRequest({
          ids: ['attack1', 'unknown'],
          tags: defaultTags,
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: { terms: { _id: ['attack1', 'alertA', 'alertB'] } } } },
        })
      );
    });

    test('updates attacks only when the attack doc has no related alert ids', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
        getSearchResponse([{ _id: 'attack1' }])
      );

      await server.inject(
        getRequest({ ...defaultBody, update_related_alerts: true }),
        requestContextMock.convertContext(context)
      );

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: { terms: { _id: ['attack1'] } } } },
        })
      );
    });
  });

  describe('tag validation', () => {
    test('returns 400 when the same tag is in both add and remove arrays', async () => {
      const response = await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: ['duplicate'], tags_to_remove: ['duplicate'] },
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: [
          'Duplicate tags ["duplicate"] were found in the tags_to_add and tags_to_remove parameters.',
        ],
        status_code: 400,
      });
    });

    test('does not update when tag validation fails', async () => {
      await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: ['duplicate'], tags_to_remove: ['duplicate'] },
        }),
        requestContextMock.convertContext(context)
      );

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('returns 500 when updateByQuery throws', async () => {
      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );

      const response = await server.inject(
        getRequest(defaultBody),
        requestContextMock.convertContext(context)
      );

      expect(response.body).toEqual({ message: 'Test error', status_code: 500 });
    });
  });

  describe('request validation', () => {
    test('allows ids and tags', async () => {
      const result = server.validate(getRequest(defaultBody));

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects an empty ids array', async () => {
      const result = server.validate(getRequest({ ids: [], tags: defaultTags }));

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('rejects a request without tags', async () => {
      const result = server.validate(getRequest({ ids: ['attack1'] }));

      expect(result.badRequest).toHaveBeenCalled();
    });
  });

  describe('telemetry', () => {
    test('reports success telemetry on tag update', async () => {
      await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));

      expect(reportEBT).toHaveBeenCalledTimes(1);
      expect(reportEBT).toHaveBeenCalledWith(
        ATTACKS_API_CALL_EVENT,
        expect.objectContaining({
          endpoint: DETECTION_ENGINE_ATTACKS_TAGS_URL,
          operation: 'tags',
          ids_count: 2,
          update_related_alerts: false,
          tags_to_add_count: 1,
          tags_to_remove_count: 0,
        })
      );
    });

    test('reports error telemetry on validation failure', async () => {
      await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: ['duplicate'], tags_to_remove: ['duplicate'] },
        }),
        requestContextMock.convertContext(context)
      );

      expect(reportEBT).toHaveBeenCalledWith(
        ATTACKS_API_CALL_EVENT,
        expect.objectContaining({
          operation: 'tags',
          error: ATTACKS_DUPLICATE_TAGS_VALIDATION_ERROR,
        })
      );
    });

    test('reports error telemetry on ES failure', async () => {
      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );

      await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));

      expect(reportEBT).toHaveBeenCalledWith(
        ATTACKS_API_CALL_EVENT,
        expect.objectContaining({
          operation: 'tags',
          error: 'Test error',
        })
      );
    });
  });

  describe('workflow trigger emission', () => {
    let mockEventBus: { emitAttackTagsChanged: jest.Mock; emitAlertTagsChanged: jest.Mock };

    beforeEach(() => {
      server = serverMock.create();
      mockEventBus = { emitAttackTagsChanged: jest.fn(), emitAlertTagsChanged: jest.fn() };
      setAttacksTagsRoute(
        server.router,
        ruleDataClient,
        telemetrySenderMock,
        mockEventBus as unknown as SecuritySolutionEventBus
      );
    });

    describe('non-cascade', () => {
      beforeEach(() => {
        context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce(
          getSearchResponse([{ _id: 'attack1' }, { _id: 'attack2' }])
        );
      });

      test('emits attackTagsChanged for non-cascade update', async () => {
        await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));
        await new Promise((r) => setTimeout(r, 0));
        expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            attackIds: ['attack1', 'attack2'],
            tagsAdded: defaultTags.tags_to_add,
            tagsRemoved: defaultTags.tags_to_remove,
            truncated: false,
          })
        );
        expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
      });

      test('does not emit when no requested IDs match the attack index (all-unknown)', async () => {
        context.core.elasticsearch.client.asCurrentUser.search.mockReset();
        context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce(
          getSearchResponse([])
        );
        await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));
        await new Promise((r) => setTimeout(r, 0));
        expect(mockEventBus.emitAttackTagsChanged).not.toHaveBeenCalled();
      });

      test('emits only confirmed IDs when the request contains unknown IDs (partial match)', async () => {
        context.core.elasticsearch.client.asCurrentUser.search.mockReset();
        context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce(
          getSearchResponse([{ _id: 'attack1' }])
        );
        await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));
        await new Promise((r) => setTimeout(r, 0));
        expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ attackIds: ['attack1'] })
        );
      });

      test('does not set truncated when the request exceeds the ID cap but the payload is complete', async () => {
        // Encoding WHY: `truncated` tells a workflow author the payload lost data. A request
        // with more IDs than MAX_ALERTS_PER_TRIGGER where only one attack actually changes
        // loses nothing, so claiming truncation would send the author hunting for IDs that
        // were never dropped. The flag must follow the emitted payload, not the request size.
        context.core.elasticsearch.client.asCurrentUser.search.mockReset();
        context.core.elasticsearch.client.asCurrentUser.search.mockResponse(
          getSearchResponse([{ _id: 'attack1' }])
        );
        const oversizedIds = Array.from(
          { length: MAX_ALERTS_PER_TRIGGER + 1 },
          (_, i) => `attack-${i}`
        );
        await server.inject(
          getRequest({ ids: oversizedIds, tags: defaultTags }),
          requestContextMock.convertContext(context)
        );
        await new Promise((r) => setTimeout(r, 0));
        expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ attackIds: ['attack1'], truncated: false })
        );
      });

      test('non-cascade: emits when the only changed tag is beyond the operation cap', async () => {
        // Encoding WHY: the non-cascade `verifiedAttackIds` predicate must use the full valid
        // arrays (not capped) so attacks whose only change is an over-cap tag still fire the
        // trigger. Without this fix the trigger is silently suppressed even though the
        // mutation ran and changed the document.
        const existingTags = Array.from({ length: MAX_TAGS_PER_OPERATION }, (_, i) => `tag-${i}`);
        const overCapTag = `tag-${MAX_TAGS_PER_OPERATION}`;
        context.core.elasticsearch.client.asCurrentUser.search.mockReset();
        context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: 0,
            hits: [
              {
                _id: 'attack1',
                _index: SCHEDULED_INDEX,
                _source: { [ALERT_WORKFLOW_TAGS]: existingTags },
              },
            ],
          },
        } as estypes.SearchResponse<unknown>);
        await server.inject(
          getRequest({
            ids: ['attack1'],
            tags: { tags_to_add: [...existingTags, overCapTag], tags_to_remove: [] },
          }),
          requestContextMock.convertContext(context)
        );
        await new Promise((r) => setTimeout(r, 0));
        expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            attackIds: ['attack1'],
            tagsAdded: [],
            truncated: true,
          })
        );
      });
    });

    test('emits attackTagsChanged and alertTagsChanged for cascade update', async () => {
      // Call 1: attack doc fetch — returns attack1 with relatedAlertIds = ['alertA']
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce(
        getSearchResponse([{ _id: 'attack1', alertIds: ['alertA'] }])
      );
      // Call 2: related alert verification — alertA exists in the unified index as a
      // detection alert. It must not be mocked in an Attack Discovery index: those hits
      // are deliberately excluded so a stale related-alert ID colliding with an AD doc
      // is never emitted as a detection-alert event.
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce(
        getSearchResponse([{ _id: 'alertA', _index: DETECTION_ALERTS_INDEX }])
      );
      await server.inject(
        getRequest({ ...defaultBody, update_related_alerts: true }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['attack1'], truncated: false })
      );
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['alertA'], truncated: false })
      );
    });

    test('does not emit alertTagsChanged when related alert IDs are not found (stale references)', async () => {
      // Call 1: attack doc fetch
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce(
        getSearchResponse([{ _id: 'attack1', alertIds: ['stale-alert'] }])
      );
      // Call 2: verification returns empty — the related alert no longer exists
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce(
        getSearchResponse([])
      );
      await server.inject(
        getRequest({ ...defaultBody, update_related_alerts: true }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalled();
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
    });

    test('does not emit when tag validation fails', async () => {
      await server.inject(
        getRequest({ ids: ['attack1'], tags: { tags_to_add: ['dup'], tags_to_remove: ['dup'] } }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).not.toHaveBeenCalled();
    });

    test('cascade: computes independent deltas — attack emit and alert emit use their own prefetched sources', async () => {
      // Encoding WHY: attack doc already has 'attack-tag'; related alert already has 'alert-tag'.
      // Each emit must use the delta from its own prefetched sources, not a shared delta.
      // If they shared a delta, 'attack-tag' would be filtered from both; it should only be
      // filtered from the attack emit, not from the related-alert emit.
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 0,
          hits: [
            {
              _id: 'attack1',
              _index: SCHEDULED_INDEX,
              _source: {
                [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['alertA'],
                [ALERT_WORKFLOW_TAGS]: ['attack-tag'],
              },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      // fetchAllAlertIdIndexWithSource (related alert sources)
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 0,
          hits: [
            {
              _id: 'alertA',
              _index: DETECTION_ALERTS_INDEX,
              _source: { [ALERT_WORKFLOW_TAGS]: ['alert-tag'] },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: ['attack-tag', 'alert-tag', 'new-tag'], tags_to_remove: [] },
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      // attack-tag already on attack1 → filtered from attack emit; present in alertA? No → kept
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tagsAdded: ['alert-tag', 'new-tag'], tagsRemoved: [] })
      );
      // alert-tag already on alertA → filtered from alert emit; present in attack1? No → kept
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tagsAdded: ['attack-tag', 'new-tag'], tagsRemoved: [] })
      );
    });

    test('cascade: suppresses alert event when all related alerts already have the requested tags', async () => {
      // Encoding WHY: verifiedRelatedAlertIds must be filtered with wouldChange before
      // emitting the alert event. Without this, a no-op cascade fires emitAlertTagsChanged
      // with an empty tagsAdded/tagsRemoved and unchanged IDs consume the 10,000-ID cap,
      // displacing IDs that actually changed in mixed batches.
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 0,
          hits: [
            {
              _id: 'attack1',
              _index: SCHEDULED_INDEX,
              _source: {
                [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['alertA'],
                [ALERT_WORKFLOW_TAGS]: [],
              },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      // Related alert already has the tag being added — wouldChange returns false.
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 0,
          hits: [
            {
              _id: 'alertA',
              _index: DETECTION_ALERTS_INDEX,
              _source: { [ALERT_WORKFLOW_TAGS]: ['already-present'] },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: ['already-present'], tags_to_remove: [] },
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      // Attack itself would change (does not have 'already-present') — attack event fires.
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledTimes(1);
      // Related alert already has 'already-present' — alert event must NOT fire.
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
    });

    test('cascade: includes attack in mutation when only over-cap tags would change it', async () => {
      // Encoding WHY: the cascade `verifiedAttackIds` predicate must use full valid arrays
      // so that attacks whose only changes are beyond MAX_TAGS_PER_OPERATION are not silently
      // dropped from the mutation's combinedIds. Without this fix an attack can be excluded
      // from updateAlertsTags even though the full request would have changed it.
      const existingTags = Array.from({ length: MAX_TAGS_PER_OPERATION }, (_, i) => `tag-${i}`);
      const overCapTag = `tag-${MAX_TAGS_PER_OPERATION}`;
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 0,
          hits: [
            {
              _id: 'attack1',
              _index: SCHEDULED_INDEX,
              _source: {
                [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: [],
                [ALERT_WORKFLOW_TAGS]: existingTags,
              },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: [...existingTags, overCapTag], tags_to_remove: [] },
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          attackIds: ['attack1'],
          // Capped tags are all already present → capped delta is empty; the over-cap tag
          // that made this attack eligible cannot appear in the payload due to the cap.
          tagsAdded: [],
          truncated: true,
        })
      );
    });

    test('cascade: includes attack in mutation when all requested tags exceed MAX_TAG_LENGTH', async () => {
      // Encoding WHY: allValidTagsToAdd filters out over-length tags, but updateAlertsTags
      // applies the original request. If allValid* controls combinedIds, a request with only
      // over-length tags produces an empty verifiedAttackIds and the attack is omitted from
      // the mutation while its related alerts are still updated — an inconsistency. The fix
      // builds combinedIds from allFoundAttackIds (all docs returned by the search) so the
      // attack is always mutated when it exists in the index.
      const overLengthTag = 'x'.repeat(MAX_TAG_LENGTH + 1);
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 0,
          hits: [
            {
              _id: 'attack1',
              _index: SCHEDULED_INDEX,
              _source: { [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: [], [ALERT_WORKFLOW_TAGS]: [] },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: [overLengthTag], tags_to_remove: [] },
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );
      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: { terms: { _id: ['attack1'] } } } },
        })
      );
    });

    test('computes actual delta — filters already-present tags from tagsAdded in non-cascade', async () => {
      // Encoding WHY: the event must not report 'existing-tag' as added because attack1
      // already has it. Only 'new-tag' is genuinely absent and should appear in tagsAdded.
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 0,
          hits: [
            {
              _id: 'attack1',
              _index: SCHEDULED_INDEX,
              _source: { [ALERT_WORKFLOW_TAGS]: ['existing-tag'] },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: ['existing-tag', 'new-tag'], tags_to_remove: [] },
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tagsAdded: ['new-tag'], tagsRemoved: [] })
      );
    });

    test('non-cascade: emits when the only changed tag exceeds MAX_TAG_LENGTH', async () => {
      // Encoding WHY: the wouldChange predicate must use the raw request tags, not the
      // allValid* arrays that strip over-length values. updateAlertsTags applies the original
      // request, so the trigger should fire whenever the mutation would change a document.
      const overLengthTag = 'x'.repeat(MAX_TAG_LENGTH + 1);
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 0,
          hits: [
            { _id: 'attack1', _index: SCHEDULED_INDEX, _source: { [ALERT_WORKFLOW_TAGS]: [] } },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: [overLengthTag], tags_to_remove: [] },
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['attack1'] })
      );
    });

    test('cascade: emits for attack when the only changed tag exceeds MAX_TAG_LENGTH', async () => {
      // Encoding WHY: same as non-cascade — the trigger must use raw request arrays so
      // over-length tags that would change a document still fire the event.
      const overLengthTag = 'x'.repeat(MAX_TAG_LENGTH + 1);
      context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 0,
          hits: [
            {
              _id: 'attack1',
              _index: SCHEDULED_INDEX,
              _source: { [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: [], [ALERT_WORKFLOW_TAGS]: [] },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: [overLengthTag], tags_to_remove: [] },
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['attack1'] })
      );
    });

    test('cascade: does not emit alertTagsChanged when related-alert source fetch fails', async () => {
      // Encoding WHY: when fetchAllAlertIdIndexWithSource throws for related alerts, the delta
      // is unknown. The previous fallback emitted verifiedRelatedAlertIds with the request
      // arrays as tagsAdded/tagsRemoved — publishing intent as fact. The fix suppresses the
      // related-alert event entirely on source-fetch failure.
      context.core.elasticsearch.client.asCurrentUser.search
        // Call 1: attack doc fetch (succeeds, returns attack1 with a related alert)
        .mockResponseOnce({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: 0,
            hits: [
              {
                _id: 'attack1',
                _index: SCHEDULED_INDEX,
                _source: {
                  [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['alertA'],
                  [ALERT_WORKFLOW_TAGS]: [],
                },
              },
            ],
          },
        } as estypes.SearchResponse<unknown>)
        // Call 2: related alert source fetch (fails)
        .mockRejectedValueOnce(new Error('ES unavailable'));
      await server.inject(
        getRequest({
          ids: ['attack1'],
          tags: { tags_to_add: ['new-tag'], tags_to_remove: [] },
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackTagsChanged).toHaveBeenCalled();
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
    });
  });
});
