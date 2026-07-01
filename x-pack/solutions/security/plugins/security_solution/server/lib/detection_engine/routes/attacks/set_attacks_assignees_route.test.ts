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
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import type { RuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';

import { DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL } from '../../../../../common/constants';
import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { setAttacksAssigneesRoute } from './set_attacks_assignees_route';

const SCHEDULED_INDEX = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default`;
const ADHOC_INDEX = `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-default`;
const DETECTION_ALERTS_INDEX = '.alerts-security.alerts-default';

const getSearchResponse = (
  hits: Array<{ _id: string; alertIds?: string[] }>
): estypes.SearchResponse<unknown> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: { value: hits.length, relation: 'eq' },
    max_score: 0,
    hits: hits.map(({ _id, alertIds }) => ({
      _id,
      _index: SCHEDULED_INDEX,
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

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse(
      getSuccessfulSignalUpdateResponse()
    );
    ruleDataClient = ruleRegistryMocks.createRuleDataClient('.alerts-security.alerts');

    setAttacksAssigneesRoute(server.router, ruleDataClient);
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
          index: [SCHEDULED_INDEX, ADHOC_INDEX],
          _source: [ALERT_ATTACK_DISCOVERY_ALERT_IDS],
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
});
