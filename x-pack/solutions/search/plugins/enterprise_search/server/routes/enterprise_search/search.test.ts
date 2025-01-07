/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockDependencies } from '../../__mocks__';

import { RequestHandlerContext } from '@kbn/core/server';

import { fetchSearchResults } from '@kbn/search-index-documents/lib';

import { registerSearchRoute } from './search';

jest.mock('@kbn/search-index-documents/lib', () => ({
  fetchSearchResults: jest.fn(),
}));

describe('Elasticsearch Search', () => {
  let mockRouter: MockRouter;
  const mockClient = {
    asCurrentUser: jest.fn(),
  };
  beforeEach(() => {
    const context = {
      core: Promise.resolve({
        elasticsearch: { client: mockClient },
      }),
    } as unknown as jest.Mocked<RequestHandlerContext>;

    mockRouter = new MockRouter({
      context,
      method: 'post',
      path: '/internal/enterprise_search/indices/{index_name}/search',
    });

    registerSearchRoute({
      ...mockDependencies,
      router: mockRouter.router,
    });
  });

  describe('POST /internal/enterprise_search/indices/{index_name}/search with query on request body', () => {
    it('fails validation without index_name', () => {
      const request = { body: { searchQuery: '' }, params: {} };
      mockRouter.shouldThrow(request);
    });

    it('returns search results for a query', async () => {
      const mockData = {
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 25,
            total: 26,
          },
        },
        data: [
          {
            _id: '5a12292a0f5ae10021650d7e',
            _index: 'search-regular-index',
            _score: 4.437291,
            _source: { id: '5a12292a0f5ae10021650d7e', name: 'banana' },
          },
        ],
      };

      (fetchSearchResults as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockData);
      });

      await mockRouter.callRoute({
        body: {
          searchQuery: 'banana',
        },
        params: { index_name: 'search-index-name' },
      });

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          results: mockData,
        },

        headers: { 'content-type': 'application/json' },
      });
    });
  });

  describe('POST /internal/enterprise_search/indices/{index_name}/search', () => {
    let mockRouterNoQuery: MockRouter;
    beforeEach(() => {
      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouterNoQuery = new MockRouter({
        context,
        method: 'post',
        path: '/internal/enterprise_search/indices/{index_name}/search',
      });

      registerSearchRoute({
        ...mockDependencies,
        router: mockRouterNoQuery.router,
      });
    });
    it('fails validation without index_name', () => {
      const request = { params: {} };
      mockRouterNoQuery.shouldThrow(request);
    });

    it('searches returns first 25 search results by default', async () => {
      const mockData = {
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 25,
            total: 26,
          },
        },
        data: [
          {
            _id: '5a12292a0f5ae10021650d7e',
            _index: 'search-regular-index',
            _score: 4.437291,
            _source: { id: '5a12292a0f5ae10021650d7e', name: 'banana' },
          },
        ],
      };

      (fetchSearchResults as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockData);
      });

      await mockRouterNoQuery.callRoute({
        params: { index_name: 'search-index-name' },
      });

      expect(fetchSearchResults).toHaveBeenCalledWith(
        mockClient.asCurrentUser,
        'search-index-name',
        'banana',
        0,
        25
      );

      expect(mockRouterNoQuery.response.ok).toHaveBeenCalledWith({
        body: {
          results: mockData,
        },

        headers: { 'content-type': 'application/json' },
      });
    });
  });
});
