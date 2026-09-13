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
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import type { RuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';

import { DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL } from '../../../../../common/constants';
import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { ATTACKS_API_CALL_EVENT } from '../../../telemetry/event_based/events';
import { ATTACKS_DUPLICATE_ASSIGNEES_VALIDATION_ERROR } from './attacks_ebt_helpers';
import { createMockTelemetryEventsSender } from '../../../telemetry/__mocks__';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { setAttacksAssigneesRoute } from './set_attacks_assignees_route';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  MAX_ALERTS_PER_TRIGGER,
  MAX_ASSIGNEE_UID_LENGTH,
  MAX_ASSIGNEES_PER_OPERATION,
} from '../../../../../common/workflows/triggers';

const SCHEDULED_INDEX = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default`;
const ADHOC_INDEX = `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-default`;
const DETECTION_ALERTS_INDEX = '.alerts-security.alerts-default';

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
    path: DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
    body,
  });

const defaultBody = {
  ids: ['attack1', 'attack2'],
  assignees: { add: ['user1'], remove: [] },
};

describe('set attacks assignees', () => {
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

    setAttacksAssigneesRoute(server.router, ruleDataClient, telemetrySenderMock);
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
          _source_includes: [ALERT_ATTACK_DISCOVERY_ALERT_IDS, ALERT_WORKFLOW_ASSIGNEE_IDS],
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
          assignees: { add: ['user1'], remove: [] },
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

  describe('assignee validation', () => {
    test('returns 400 when the same assignee is in add and remove', async () => {
      const response = await server.inject(
        getRequest({
          ids: ['attack1'],
          assignees: { add: ['user1'], remove: ['user1'] },
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(400);
    });

    test('does not update when assignee validation fails', async () => {
      await server.inject(
        getRequest({
          ids: ['attack1'],
          assignees: { add: ['user1'], remove: ['user1'] },
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
    test('allows ids and assignees', async () => {
      const result = server.validate(getRequest(defaultBody));

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects an empty ids array', async () => {
      const result = server.validate(
        getRequest({ ids: [], assignees: { add: ['user1'], remove: [] } })
      );

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('rejects a request without assignees', async () => {
      const result = server.validate(getRequest({ ids: ['attack1'] }));

      expect(result.badRequest).toHaveBeenCalled();
    });
  });

  describe('telemetry', () => {
    test('reports success telemetry on assignee update', async () => {
      await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));

      expect(reportEBT).toHaveBeenCalledTimes(1);
      expect(reportEBT).toHaveBeenCalledWith(
        ATTACKS_API_CALL_EVENT,
        expect.objectContaining({
          endpoint: DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
          operation: 'assignees',
          ids_count: 2,
          update_related_alerts: false,
          assignees_to_add_count: 1,
          assignees_to_remove_count: 0,
        })
      );
    });

    test('reports error telemetry on validation failure', async () => {
      await server.inject(
        getRequest({
          ids: ['attack1'],
          assignees: { add: ['user1'], remove: ['user1'] },
        }),
        requestContextMock.convertContext(context)
      );

      expect(reportEBT).toHaveBeenCalledWith(
        ATTACKS_API_CALL_EVENT,
        expect.objectContaining({
          operation: 'assignees',
          error: ATTACKS_DUPLICATE_ASSIGNEES_VALIDATION_ERROR,
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
          operation: 'assignees',
          error: 'Test error',
        })
      );
    });
  });

  describe('workflow trigger emission', () => {
    let mockEventBus: {
      emitAttackAssigneesChanged: jest.Mock;
      emitAlertAssigneesChanged: jest.Mock;
    };

    beforeEach(() => {
      server = serverMock.create();
      mockEventBus = {
        emitAttackAssigneesChanged: jest.fn(),
        emitAlertAssigneesChanged: jest.fn(),
      };
      setAttacksAssigneesRoute(
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

      test('emits attackAssigneesChanged for non-cascade update', async () => {
        await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));
        await new Promise((r) => setTimeout(r, 0));
        expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            attackIds: ['attack1', 'attack2'],
            assigneesAdded: ['user1'],
            assigneesRemoved: [],
            truncated: false,
          })
        );
        expect(mockEventBus.emitAlertAssigneesChanged).not.toHaveBeenCalled();
      });

      test('does not emit when no requested IDs match the attack index (all-unknown)', async () => {
        // Override: search returns empty — none of the IDs are real attack docs
        context.core.elasticsearch.client.asCurrentUser.search.mockReset();
        context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce(
          getSearchResponse([])
        );
        await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));
        await new Promise((r) => setTimeout(r, 0));
        expect(mockEventBus.emitAttackAssigneesChanged).not.toHaveBeenCalled();
      });

      test('emits only confirmed IDs when the request contains unknown IDs (partial match)', async () => {
        // Override: only attack1 exists, attack2 is unknown
        context.core.elasticsearch.client.asCurrentUser.search.mockReset();
        context.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce(
          getSearchResponse([{ _id: 'attack1' }])
        );
        await server.inject(getRequest(defaultBody), requestContextMock.convertContext(context));
        await new Promise((r) => setTimeout(r, 0));
        expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
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
          getRequest({ ids: oversizedIds, assignees: { add: ['user1'], remove: [] } }),
          requestContextMock.convertContext(context)
        );
        await new Promise((r) => setTimeout(r, 0));
        expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ attackIds: ['attack1'], truncated: false })
        );
      });

      test('non-cascade: emits when the only changed assignee is beyond the operation cap', async () => {
        // Encoding WHY: the non-cascade `verifiedAttackIds` predicate must use the full valid
        // arrays (not capped) so attacks whose only change is an over-cap assignee still fire
        // the trigger. Without this fix the trigger is silently suppressed even though the
        // mutation ran and changed the document.
        const existingUids = Array.from(
          { length: MAX_ASSIGNEES_PER_OPERATION },
          (_, i) => `uid-${i}`
        );
        const overCapUid = `uid-${MAX_ASSIGNEES_PER_OPERATION}`;
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
                _source: { [ALERT_WORKFLOW_ASSIGNEE_IDS]: existingUids },
              },
            ],
          },
        } as estypes.SearchResponse<unknown>);
        await server.inject(
          getRequest({
            ids: ['attack1'],
            assignees: { add: [...existingUids, overCapUid], remove: [] },
          }),
          requestContextMock.convertContext(context)
        );
        await new Promise((r) => setTimeout(r, 0));
        expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            attackIds: ['attack1'],
            assigneesAdded: [],
            truncated: true,
          })
        );
      });
    });

    test('emits attackAssigneesChanged and alertAssigneesChanged for cascade update', async () => {
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
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['attack1'], truncated: false })
      );
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ alertIds: ['alertA'], truncated: false })
      );
    });

    test('does not emit alertAssigneesChanged when related alert IDs are not found (stale references)', async () => {
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
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalled();
      expect(mockEventBus.emitAlertAssigneesChanged).not.toHaveBeenCalled();
    });

    test('does not emit when validation fails', async () => {
      await server.inject(
        getRequest({ ids: ['attack1'], assignees: { add: ['user1'], remove: ['user1'] } }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackAssigneesChanged).not.toHaveBeenCalled();
    });

    test('cascade: computes independent deltas — attack emit and alert emit use their own prefetched sources', async () => {
      // Encoding WHY: attack doc already has 'attack-uid'; related alert already has 'alert-uid'.
      // Each emit must use the delta from its own prefetched sources, not a shared delta.
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
                [ALERT_WORKFLOW_ASSIGNEE_IDS]: ['attack-uid'],
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
              _source: { [ALERT_WORKFLOW_ASSIGNEE_IDS]: ['alert-uid'] },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          assignees: { add: ['attack-uid', 'alert-uid', 'new-uid'], remove: [] },
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      // attack-uid already on attack1 → filtered from attack emit; present in alertA? No → kept
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ assigneesAdded: ['alert-uid', 'new-uid'], assigneesRemoved: [] })
      );
      // alert-uid already on alertA → filtered from alert emit; present in attack1? No → kept
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ assigneesAdded: ['attack-uid', 'new-uid'], assigneesRemoved: [] })
      );
    });

    test('cascade: includes attack in mutation when only over-cap assignees would change it', async () => {
      // Encoding WHY: the cascade `verifiedAttackIds` predicate must use full valid arrays so
      // that attacks whose only changes are beyond MAX_ASSIGNEES_PER_OPERATION are not silently
      // dropped from the mutation's combinedIds. Without this fix an attack can be excluded from
      // updateAlertsAssignees even though the full request would have changed it.
      const existingUids = Array.from(
        { length: MAX_ASSIGNEES_PER_OPERATION },
        (_, i) => `uid-${i}`
      );
      const overCapUid = `uid-${MAX_ASSIGNEES_PER_OPERATION}`;
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
                [ALERT_WORKFLOW_ASSIGNEE_IDS]: existingUids,
              },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          assignees: { add: [...existingUids, overCapUid], remove: [] },
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          attackIds: ['attack1'],
          assigneesAdded: [],
          truncated: true,
        })
      );
    });

    test('cascade: includes attack in mutation when all requested assignees exceed MAX_ASSIGNEE_UID_LENGTH', async () => {
      // Encoding WHY: allValidAssigneesToAdd filters out over-length UIDs, but
      // updateAlertsAssignees applies the original request. If allValid* controls combinedIds,
      // a request with only over-length UIDs produces an empty verifiedAttackIds and the attack
      // is omitted from the mutation while its related alerts are still updated — an
      // inconsistency. The fix builds combinedIds from allFoundAttackIds so the attack is
      // always mutated when it exists in the index.
      const overLengthUid = 'x'.repeat(MAX_ASSIGNEE_UID_LENGTH + 1);
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
                [ALERT_WORKFLOW_ASSIGNEE_IDS]: [],
              },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          assignees: { add: [overLengthUid], remove: [] },
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

    test('computes actual delta — filters already-present assignees from assigneesAdded in non-cascade', async () => {
      // Encoding WHY: the event must not report 'existing-uid' as added because attack1
      // already has it. Only 'new-uid' is genuinely absent and should appear in assigneesAdded.
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
              _source: { [ALERT_WORKFLOW_ASSIGNEE_IDS]: ['existing-uid'] },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          assignees: { add: ['existing-uid', 'new-uid'], remove: [] },
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ assigneesAdded: ['new-uid'], assigneesRemoved: [] })
      );
    });

    test('non-cascade: emits when the only changed assignee exceeds MAX_ASSIGNEE_UID_LENGTH', async () => {
      // Encoding WHY: the wouldChange predicate must use the raw request assignees, not the
      // allValid* arrays that strip over-length UIDs. updateAlertsAssignees applies the original
      // request, so the trigger should fire whenever the mutation would change a document.
      const overLengthUid = 'x'.repeat(MAX_ASSIGNEE_UID_LENGTH + 1);
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
              _source: { [ALERT_WORKFLOW_ASSIGNEE_IDS]: [] },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({ ids: ['attack1'], assignees: { add: [overLengthUid], remove: [] } }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['attack1'] })
      );
    });

    test('cascade: emits for attack when the only changed assignee exceeds MAX_ASSIGNEE_UID_LENGTH', async () => {
      // Encoding WHY: same as non-cascade — the trigger must use raw request arrays so
      // over-length UIDs that would change a document still fire the event.
      const overLengthUid = 'x'.repeat(MAX_ASSIGNEE_UID_LENGTH + 1);
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
                [ALERT_WORKFLOW_ASSIGNEE_IDS]: [],
              },
            },
          ],
        },
      } as estypes.SearchResponse<unknown>);
      await server.inject(
        getRequest({
          ids: ['attack1'],
          assignees: { add: [overLengthUid], remove: [] },
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ attackIds: ['attack1'] })
      );
    });

    test('cascade: does not emit alertAssigneesChanged when related-alert source fetch fails', async () => {
      // Encoding WHY: when fetchAllAlertIdIndexWithSource throws for related alerts, the delta
      // is unknown. The previous fallback emitted verifiedRelatedAlertIds with the request
      // arrays as assigneesAdded/assigneesRemoved — publishing intent as fact. The fix
      // suppresses the related-alert event entirely on source-fetch failure.
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
                  [ALERT_WORKFLOW_ASSIGNEE_IDS]: [],
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
          assignees: { add: ['new-uid'], remove: [] },
          update_related_alerts: true,
        }),
        requestContextMock.convertContext(context)
      );
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAttackAssigneesChanged).toHaveBeenCalled();
      expect(mockEventBus.emitAlertAssigneesChanged).not.toHaveBeenCalled();
    });
  });
});
