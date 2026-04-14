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

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS } from '../../../../../../../common/constants';
import { requestContextMock, requestMock, serverMock } from '../../../../routes/__mocks__';
import { getFindResultWithSingleHit } from '../../../../routes/__mocks__/request_responses';
import { findRulesWithFacetsRoute } from './route';
import type {
  MockClients,
  SecuritySolutionRequestHandlerContextMock,
} from '../../../../routes/__mocks__/request_context';

const defaultInput = {
  per_page: 20,
  page: 1,
  sort_field: 'name',
  sort_order: 'asc',
};

describe('Find rules with facets route', () => {
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

    findRulesWithFacetsRoute(server.router, logger);
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
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
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
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
        body: { ...defaultInput, page: 3 },
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(clients.rulesClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ page: 3 }),
        })
      );
    });

    it('omits page for rulesClient.find when search_after is present', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
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
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
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
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
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
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
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
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
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
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
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
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
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
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
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
});
