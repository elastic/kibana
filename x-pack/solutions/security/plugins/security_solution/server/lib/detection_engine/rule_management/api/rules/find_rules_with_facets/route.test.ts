/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS } from '../../../../../../../common/constants';
import { MAX_RESULTS_WINDOW } from '../../../../../../usage/constants';
import { requestContextMock, requestMock, serverMock } from '../../../../routes/__mocks__';
import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
} from '../../../../routes/__mocks__/request_responses';
import { findRulesWithFacetsRoute } from './route';
import type {
  MockClients,
  SecuritySolutionRequestHandlerContextMock,
} from '../../../../routes/__mocks__/request_context';

const baseFacetsBody = () => ({
  per_page: 20,
  page: 1,
  sort_field: 'name',
  sort_order: 'asc',
});

describe('Find rules with facets route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let clients: MockClients;
  let context: SecuritySolutionRequestHandlerContextMock;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    findRulesWithFacetsRoute(server.router, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('search_after pagination', () => {
    it('passes search_after from the request body to rulesClient.find', async () => {
      const searchAfter = [1_234_567_890, 'rule-cursor-id'] as const;

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
        body: {
          ...baseFacetsBody(),
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

    it('omits searchAfter when search_after is absent', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
        body: baseFacetsBody(),
      });

      await server.inject(request, requestContextMock.convertContext(context));

      const findParams = clients.rulesClient.find.mock.calls[0]?.[0];
      if (!findParams) {
        throw new Error('expected rulesClient.find to have been called');
      }
      const options = findParams.options as Record<string, unknown>;
      expect(options.searchAfter).toBeUndefined();
    });

    it('passes request page to rulesClient.find when search_after is absent', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
        body: { ...baseFacetsBody(), page: 3 },
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
          ...baseFacetsBody(),
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

    it('returns 400 when search_after is present but sort_field and sort_order are missing', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
        body: {
          per_page: 20,
          page: 1,
          search_after: ['a'],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'when search_after is provided, sort_field and sort_order must be set',
        ])
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

    it('does not set response search_after when results are empty', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
        body: baseFacetsBody(),
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.total).toEqual(0);
      expect(response.body.data).toEqual([]);
      expect(response.body.search_after).toBeUndefined();
    });

    it('does not set response search_after under max result window without request search_after', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
        body: { per_page: 20, page: 1 },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.search_after).toBeUndefined();
    });

    it('sets response search_after when offset reaches the max result window', async () => {
      clients.rulesClient.find.mockResolvedValue({
        ...getFindResultWithSingleHit(),
        searchAfter: ['opaque-sort', 'rule-id'],
      });

      const page = Math.ceil(MAX_RESULTS_WINDOW / 20);

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
        body: {
          ...baseFacetsBody(),
          page,
          per_page: 20,
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.search_after).toEqual(['opaque-sort', 'rule-id']);
    });

    it('sets response search_after when the request used search_after', async () => {
      clients.rulesClient.find.mockResolvedValue({
        ...getFindResultWithSingleHit(),
        searchAfter: ['s'],
      });

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
        body: {
          ...baseFacetsBody(),
          search_after: ['prev'],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.search_after).toEqual(['s']);
    });
  });

  describe('status codes', () => {
    it('returns 200', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
        body: baseFacetsBody(),
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });
  });
});
