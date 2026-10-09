/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../../../usage/constants', () => {
  const actual = jest.requireActual('../../../../../../usage/constants');
  return { ...actual, MAX_RESULTS_WINDOW: 2 };
});

jest.mock('../../../logic/search/get_gap_filtered_rule_ids');

import { loggingSystemMock } from '@kbn/core/server/mocks';

import {
  MAX_RULES_WITH_GAPS_TO_FETCH,
  MAX_RULES_WITH_GAPS_LIMIT_REACHED_WARNING_TYPE,
} from '../../../../../../../common/constants';
import { RULE_MANAGEMENT_RULES_URL_SEARCH } from '../../../../../../../common/api/detection_engine/rule_management/urls';
import { requestContextMock, requestMock, serverMock } from '../../../../routes/__mocks__';
import { getFindResultWithSingleHit } from '../../../../routes/__mocks__/request_responses';
import { searchRulesRoute } from './route';
import type {
  MockClients,
  SecuritySolutionRequestHandlerContextMock,
} from '../../../../routes/__mocks__/request_context';
import { getGapFilteredRuleIds } from '../../../logic/search/get_gap_filtered_rule_ids';

const mockGetGapFilteredRuleIds = getGapFilteredRuleIds as jest.MockedFunction<
  typeof getGapFilteredRuleIds
>;

const defaultInput = {
  per_page: 20,
  page: 1,
  sort_field: 'name',
  sort_order: 'asc',
};

describe('search rules route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let clients: MockClients;
  let context: SecuritySolutionRequestHandlerContextMock;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue({
      ...getFindResultWithSingleHit(),
      searchAfter: [1234567890, 'abc'],
    });

    searchRulesRoute(server.router, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('search_after pagination', () => {
    it('passes search_after from the request body to rulesClient.find', async () => {
      const searchAfter = [1234567890, '123123'] as const;

      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: {
          ...defaultInput,
          search_after: [...searchAfter],
        },
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(clients.rulesClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            searchAfter: [...searchAfter],
            page: undefined,
            perPage: 20,
            sortField: 'name',
            sortOrder: 'asc',
          }),
        })
      );
    });

    it('passes request page to rulesClient.find when search_after is absent', async () => {
      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: { ...defaultInput, page: 1, per_page: 1 },
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(clients.rulesClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ page: 1, perPage: 1 }),
        })
      );
    });

    it('omits page for rulesClient.find when search_after is present', async () => {
      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: {
          ...defaultInput,
          page: 7,
          search_after: ['x'],
        },
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(clients.rulesClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ page: undefined }),
        })
      );
    });

    it('returns 400 when only sort_field is set without sort_order', async () => {
      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: {
          per_page: 20,
          page: 1,
          sort_field: 'name',
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'when "sort_order" and "sort_field" must exist together or not at all',
        ])
      );
    });

    it('returns search_after when page * per_page reaches the max result window', async () => {
      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        // page(1) * per_page(2) == MAX_RESULTS_WINDOW(2)
        body: { ...defaultInput, page: 1, per_page: 2 },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.search_after).toEqual([1234567890, 'abc']);
    });

    it('returns search_after when the request includes search_after (continuation)', async () => {
      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: {
          ...defaultInput,
          search_after: [1234567890, 'prev-cursor'],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.search_after).toEqual([1234567890, 'abc']);
    });

    it('does not return search_after when sort_field and sort_order are missing even at max window', async () => {
      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        // page(1) * per_page(2) == MAX_RESULTS_WINDOW(2) but no sort
        body: { page: 1, per_page: 2 },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.search_after).toBeUndefined();
    });

    it('does not return search_after when the underlying client returns no cursor', async () => {
      clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: { ...defaultInput, page: 1, per_page: 2 },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.search_after).toBeUndefined();
    });
  });

  describe('facet aggregations', () => {
    it('returns counts from rulesClient.find and maps friendly facet keys to ES fields', async () => {
      clients.rulesClient.find.mockResolvedValue({
        ...getFindResultWithSingleHit(),
        aggregations: {
          facet_tags: {
            buckets: [
              { key: 'tag1', doc_count: 3 },
              { key: 'tag2', doc_count: 1 },
            ],
          },
        },
      });

      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: {
          ...defaultInput,
          aggregations: { counts: ['tags'] },
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.counts).toEqual({
        tags: { tag1: 3, tag2: 1 },
      });
      expect(clients.rulesClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            aggs: expect.objectContaining({
              facet_tags: {
                terms: expect.objectContaining({ field: 'alert.attributes.tags' }),
              },
            }),
          }),
        })
      );
    });

    it('includes facet values with doc_count 0 in counts', async () => {
      clients.rulesClient.find.mockResolvedValue({
        ...getFindResultWithSingleHit(),
        aggregations: {
          facet_enabled: {
            buckets: [
              { key: true, doc_count: 5 },
              { key: false, doc_count: 0 },
            ],
          },
        },
      });

      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: {
          ...defaultInput,
          aggregations: { counts: ['enabled'] },
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.counts).toEqual({
        enabled: { true: 5, false: 0 },
      });
    });
  });

  describe('gap filtering', () => {
    const gapBody = {
      ...defaultInput,
      gap_fill_statuses: ['unfilled'],
      gaps_range_start: '2024-01-01T00:00:00.000Z',
      gaps_range_end: '2024-01-08T00:00:00.000Z',
    };

    it('calls getGapFilteredRuleIds and passes ruleIds to rulesClient.find when gap params are set', async () => {
      mockGetGapFilteredRuleIds.mockResolvedValue({ ruleIds: ['id-1', 'id-2'], truncated: false });

      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: gapBody,
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(mockGetGapFilteredRuleIds).toHaveBeenCalledWith(
        expect.objectContaining({
          gapFillStatuses: ['unfilled'],
          gapRange: {
            start: '2024-01-01T00:00:00.000Z',
            end: '2024-01-08T00:00:00.000Z',
          },
          maxRuleIds: MAX_RULES_WITH_GAPS_TO_FETCH,
          schedulerId: undefined,
        })
      );
      expect(clients.rulesClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            filter: expect.stringContaining('id-1'),
          }),
        })
      );
    });

    it('passes gap_auto_fill_scheduler_id to getGapFilteredRuleIds', async () => {
      mockGetGapFilteredRuleIds.mockResolvedValue({ ruleIds: ['id-1'], truncated: false });

      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: { ...gapBody, gap_auto_fill_scheduler_id: 'scheduler-abc' },
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(mockGetGapFilteredRuleIds).toHaveBeenCalledWith(
        expect.objectContaining({ schedulerId: 'scheduler-abc' })
      );
    });

    it('returns empty result without calling rulesClient.find when no rules have gaps', async () => {
      mockGetGapFilteredRuleIds.mockResolvedValue({ ruleIds: [], truncated: false });

      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: gapBody,
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.total).toEqual(0);
      expect(response.body.data).toEqual([]);
      expect(clients.rulesClient.find).not.toHaveBeenCalled();
    });

    it('includes a warning when the gap results are truncated', async () => {
      mockGetGapFilteredRuleIds.mockResolvedValue({ ruleIds: ['id-1'], truncated: true });

      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: gapBody,
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: MAX_RULES_WITH_GAPS_LIMIT_REACHED_WARNING_TYPE }),
        ])
      );
    });

    it('returns 400 when gap_fill_statuses is provided without range', async () => {
      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: {
          ...defaultInput,
          gap_fill_statuses: ['unfilled'],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(mockGetGapFilteredRuleIds).not.toHaveBeenCalled();
    });

    it('does not call getGapFilteredRuleIds when no gap params are set', async () => {
      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: defaultInput,
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(mockGetGapFilteredRuleIds).not.toHaveBeenCalled();
    });

    it('rejects search_after when gap filters are active', async () => {
      mockGetGapFilteredRuleIds.mockResolvedValue({ ruleIds: ['id-1'], truncated: false });

      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: {
          ...gapBody,
          search_after: [12345, 'cursor'],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('"search_after" is not supported when gap filtering is active'),
        ])
      );
    });

    it('does not return search_after in response when gap filters are active', async () => {
      mockGetGapFilteredRuleIds.mockResolvedValue({ ruleIds: ['id-1'], truncated: false });

      const request = requestMock.create({
        method: 'post',
        path: RULE_MANAGEMENT_RULES_URL_SEARCH,
        body: { ...gapBody, page: 1, per_page: 2 },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.search_after).toBeUndefined();
    });
  });
});
