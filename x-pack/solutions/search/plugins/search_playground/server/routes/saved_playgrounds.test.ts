/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  RequestHandlerContext,
  SavedObjectsErrorHelpers,
  StartServicesAccessor,
} from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { MockRouter } from '../../__mocks__/router.mock';
import {
  APIRoutes,
  SearchPlaygroundPluginStart,
  SearchPlaygroundPluginStartDependencies,
} from '../types';

import { ROUTE_VERSIONS } from '../../common';
import { defineSavedPlaygroundRoutes } from './saved_playgrounds';

describe('Search Playground - Playgrounds API', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  let mockRouter: MockRouter;
  const mockSOClient = {
    create: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
  };
  const mockCore = {
    savedObjects: { client: mockSOClient },
  };

  let context: jest.Mocked<RequestHandlerContext>;
  let mockGetStartServices: jest.Mocked<
    StartServicesAccessor<SearchPlaygroundPluginStartDependencies, SearchPlaygroundPluginStart>
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    const coreStart = coreMock.createStart();
    mockGetStartServices = jest.fn().mockResolvedValue([coreStart, {}, {}]);

    context = {
      core: Promise.resolve(mockCore),
    } as unknown as jest.Mocked<RequestHandlerContext>;
  });

  describe('GET /internal/search_playground/playgrounds', () => {
    describe('v1', () => {
      beforeEach(() => {
        mockRouter = new MockRouter({
          context,
          method: 'get',
          path: APIRoutes.GET_PLAYGROUNDS,
          version: ROUTE_VERSIONS.v1,
        });
        defineSavedPlaygroundRoutes({
          logger: mockLogger,
          router: mockRouter.router,
          getStartServices: mockGetStartServices,
        });
      });

      it('should call the find method of the saved objects client', async () => {
        mockSOClient.find.mockResolvedValue({
          total: 1,
          page: 1,
          per_page: 10,
          saved_objects: [
            {
              id: '1',
              type: 'search_playground',
              created_at: '2023-10-01T00:00:00Z',
              updated_at: '2023-10-01T00:00:00Z',
              attributes: {
                name: 'Playground 1',
              },
            },
          ],
        });

        await expect(
          mockRouter.callRoute({
            query: {
              page: 1,
              size: 10,
              sortField: 'created_at',
              sortOrder: 'desc',
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockSOClient.find).toHaveBeenCalledWith({
          type: 'search_playground',
          perPage: 10,
          page: 1,
          sortField: 'created_at',
          sortOrder: 'desc',
        });
        expect(mockRouter.response.ok).toHaveBeenCalledWith({
          body: {
            _meta: {
              page: 1,
              size: 10,
              total: 1,
            },
            items: [
              {
                id: '1',
                name: 'Playground 1',
                createdAt: '2023-10-01T00:00:00Z',
                createdBy: undefined,
                updatedAt: '2023-10-01T00:00:00Z',
                updatedBy: undefined,
              },
            ],
          },
          headers: { 'content-type': 'application/json' },
        });
      });
      it('uses query parameters to call the saved objects search', async () => {
        mockSOClient.find.mockResolvedValue({
          total: 1,
          page: 1,
          per_page: 10,
          saved_objects: [
            {
              id: '1',
              type: 'search_playground',
              created_at: '2023-10-01T00:00:00Z',
              updated_at: '2023-10-01T00:00:00Z',
              attributes: {
                name: 'Playground 1',
              },
            },
          ],
        });

        await expect(
          mockRouter.callRoute({
            query: {
              page: 2,
              size: 15,
              sortField: 'updated_at',
              sortOrder: 'asc',
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockSOClient.find).toHaveBeenCalledWith({
          type: 'search_playground',
          perPage: 15,
          page: 2,
          sortField: 'updated_at',
          sortOrder: 'asc',
        });
      });
      it('handles saved object client errors', async () => {
        mockSOClient.find.mockRejectedValue(
          SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Forbidden'))
        );

        await expect(
          mockRouter.callRoute({
            query: {
              page: 1,
              size: 10,
              sortField: 'created_at',
              sortOrder: 'desc',
            },
          })
        ).resolves.toEqual(undefined);
        expect(mockRouter.response.customError).toHaveBeenCalledWith({
          statusCode: 403,
          body: {
            message: 'Forbidden',
          },
        });
      });
      it('re-raises errors from the saved objects client', async () => {
        const error = new Error('Saved object error');
        mockSOClient.find.mockRejectedValue(error);

        await expect(
          mockRouter.callRoute({
            query: {
              page: 1,
              size: 10,
              sortField: 'created_at',
              sortOrder: 'desc',
            },
          })
        ).rejects.toThrowError(error);
      });
    });
  });
  describe('GET /internal/search_playground/playgrounds/{id}', () => {
    describe('v1', () => {
      beforeEach(() => {
        mockRouter = new MockRouter({
          context,
          method: 'get',
          path: APIRoutes.GET_PLAYGROUND,
          version: ROUTE_VERSIONS.v1,
        });
        defineSavedPlaygroundRoutes({
          logger: mockLogger,
          router: mockRouter.router,
          getStartServices: mockGetStartServices,
        });
      });
      it('should parse and return SO response', async () => {
        mockSOClient.get.mockResolvedValue({
          id: '1',
          type: 'search_playground',
          created_at: '2023-10-01T00:00:00Z',
          updated_at: '2023-10-01T00:00:00Z',
          attributes: {
            name: 'Playground 1',
            indices: ['index1'],
            queryFields: { index1: ['field1'] },
            elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
          },
          references: [],
          version: '1',
          namespaces: ['default'],
          migrationVersion: {},
        });

        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockSOClient.get).toHaveBeenCalledWith('search_playground', '1');
        expect(mockRouter.response.ok).toHaveBeenCalledWith({
          body: {
            _meta: {
              id: '1',
              createdAt: '2023-10-01T00:00:00Z',
              updatedAt: '2023-10-01T00:00:00Z',
            },
            data: {
              name: 'Playground 1',
              indices: ['index1'],
              queryFields: { index1: ['field1'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
            },
          },
          headers: { 'content-type': 'application/json' },
        });
      });
      it('should handle 404s from so client', async () => {
        mockSOClient.get.mockResolvedValue({
          error: {
            statusCode: 404,
          },
        });

        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockRouter.response.notFound).toHaveBeenCalledWith({
          body: {
            message: '1 playground not found',
          },
        });
      });
      it('should reformat other errors from so client', async () => {
        mockSOClient.get.mockResolvedValue({
          error: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'some error message',
            metadata: {
              foo: 'bar',
            },
          },
        });

        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockRouter.response.customError).toHaveBeenCalledWith({
          statusCode: 401,
          body: {
            message: 'Unauthorized',
            attributes: {
              error: 'some error message',
              foo: 'bar',
            },
          },
        });
      });
      it('should handle thrown errors from so client', async () => {
        mockSOClient.get.mockRejectedValue(
          SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Unauthorized'))
        );

        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockRouter.response.customError).toHaveBeenCalledWith({
          statusCode: 403,
          body: {
            message: 'Unauthorized',
          },
        });
      });
      it('should re-throw exceptions from so client', async () => {
        const error = new Error('Saved object error');
        mockSOClient.get.mockRejectedValue(error);

        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
          })
        ).rejects.toThrowError(error);
      });
    });
  });
  describe('PUT /internal/search_playground/playgrounds', () => {
    describe('v1', () => {
      beforeEach(() => {
        mockRouter = new MockRouter({
          context,
          method: 'put',
          path: APIRoutes.PUT_PLAYGROUND_CREATE,
          version: ROUTE_VERSIONS.v1,
        });
        defineSavedPlaygroundRoutes({
          logger: mockLogger,
          router: mockRouter.router,
          getStartServices: mockGetStartServices,
        });
      });
      it('returns full response with ID for success', async () => {
        mockSOClient.create.mockResolvedValue({
          id: '1',
          type: 'search_playground',
          created_at: '2023-10-01T00:00:00Z',
          updated_at: '2023-10-01T00:00:00Z',
          attributes: {
            name: 'Playground 1',
            indices: ['index1'],
            queryFields: { index1: ['field1'] },
            elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
          },
          references: [],
          version: '1',
          namespaces: ['default'],
          migrationVersion: {},
        });

        await expect(
          mockRouter.callRoute({
            body: {
              name: 'Playground 1',
              indices: ['index1'],
              queryFields: { index1: ['field1'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockSOClient.create).toHaveBeenCalledWith('search_playground', {
          name: 'Playground 1',
          indices: ['index1'],
          queryFields: { index1: ['field1'] },
          elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
        });
        expect(mockRouter.response.ok).toHaveBeenCalledWith({
          body: {
            _meta: {
              id: '1',
              createdAt: '2023-10-01T00:00:00Z',
              updatedAt: '2023-10-01T00:00:00Z',
            },
            data: {
              name: 'Playground 1',
              indices: ['index1'],
              queryFields: { index1: ['field1'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
            },
          },
          headers: { 'content-type': 'application/json' },
        });
      });
      it('handles errors from the saved objects client', async () => {
        mockSOClient.create.mockResolvedValue({
          error: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'some error message',
            metadata: {
              foo: 'bar',
            },
          },
        });

        await expect(
          mockRouter.callRoute({
            body: {
              name: 'Playground 1',
              indices: ['index1'],
              queryFields: { index1: ['field1'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockRouter.response.customError).toHaveBeenCalledWith({
          statusCode: 401,
          body: {
            message: 'Unauthorized',
            attributes: {
              error: 'some error message',
              foo: 'bar',
            },
          },
        });
      });
      it('handles thrown errors from the saved objects client', async () => {
        mockSOClient.create.mockRejectedValue(
          SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Forbidden'))
        );

        await expect(
          mockRouter.callRoute({
            body: {
              name: 'Playground 1',
              indices: ['index1'],
              queryFields: { index1: ['field1'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockRouter.response.customError).toHaveBeenCalledWith({
          statusCode: 403,
          body: {
            message: 'Forbidden',
          },
        });
      });
      it('re-throws exceptions from the saved objects client', async () => {
        const error = new Error('Saved object error');
        mockSOClient.create.mockRejectedValue(error);

        await expect(
          mockRouter.callRoute({
            body: {
              name: 'Playground 1',
              indices: ['index1'],
              queryFields: { index1: ['field1'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
            },
          })
        ).rejects.toThrowError(error);
      });
    });
  });
  describe('PUT /internal/search_playground/playgrounds/{id}', () => {
    describe('v1', () => {
      beforeEach(() => {
        mockRouter = new MockRouter({
          context,
          method: 'put',
          path: APIRoutes.PUT_PLAYGROUND_UPDATE,
          version: ROUTE_VERSIONS.v1,
        });
        defineSavedPlaygroundRoutes({
          logger: mockLogger,
          router: mockRouter.router,
          getStartServices: mockGetStartServices,
        });
      });
      it('returns empty response on success', async () => {
        mockSOClient.update.mockResolvedValue({});
        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
            body: {
              name: 'Updated Playground',
              indices: ['index1'],
              queryFields: { index1: ['field1'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockSOClient.update).toHaveBeenCalledWith('search_playground', '1', {
          name: 'Updated Playground',
          indices: ['index1'],
          queryFields: { index1: ['field1'] },
          elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
        });
        expect(mockRouter.response.ok).toHaveBeenCalledWith();
      });
      it('handles errors from the saved objects client', async () => {
        mockSOClient.update.mockResolvedValue({
          error: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'some error message',
            metadata: {
              foo: 'bar',
            },
          },
        });

        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
            body: {
              name: 'Updated Playground',
              indices: ['index1'],
              queryFields: { index1: ['field1'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
            },
          })
        ).resolves.toEqual(undefined);
        expect(mockRouter.response.customError).toHaveBeenCalledWith({
          statusCode: 401,
          body: {
            message: 'Unauthorized',
            attributes: {
              error: 'some error message',
              foo: 'bar',
            },
          },
        });
      });
      it('handles saved object client errors', async () => {
        mockSOClient.update.mockRejectedValue(
          SavedObjectsErrorHelpers.createGenericNotFoundError('1', 'search_playground')
        );

        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
            body: {
              name: 'Updated Playground',
              indices: ['index1'],
              queryFields: { index1: ['field1'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockRouter.response.customError).toHaveBeenCalledWith({
          statusCode: 404,
          body: {
            message: 'Saved object [1/search_playground] not found',
          },
        });
      });
      it('re-throws exceptions from the saved objects client', async () => {
        const error = new Error('Saved object error');
        mockSOClient.update.mockRejectedValue(error);

        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
            body: {
              name: 'Updated Playground',
              indices: ['index1'],
              queryFields: { index1: ['field1'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`,
            },
          })
        ).rejects.toThrowError(error);
      });
    });
  });
  describe('DELETE /internal/search_playground/playgrounds/{id}', () => {
    describe('v1', () => {
      beforeEach(() => {
        mockRouter = new MockRouter({
          context,
          method: 'delete',
          path: APIRoutes.DELETE_PLAYGROUND,
          version: ROUTE_VERSIONS.v1,
        });
        defineSavedPlaygroundRoutes({
          logger: mockLogger,
          router: mockRouter.router,
          getStartServices: mockGetStartServices,
        });
      });
      it('returns empty response on success', async () => {
        mockSOClient.delete.mockResolvedValue({});
        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockSOClient.delete).toHaveBeenCalledWith('search_playground', '1');
        expect(mockRouter.response.ok).toHaveBeenCalledWith();
      });
      it('handles 404s from the saved objects client', async () => {
        mockSOClient.delete.mockRejectedValue(
          SavedObjectsErrorHelpers.createGenericNotFoundError('1', 'search_playground')
        );
        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockRouter.response.customError).toHaveBeenCalledWith({
          statusCode: 404,
          body: {
            message: 'Saved object [1/search_playground] not found',
          },
        });
      });
      it('handles errors from the saved objects client', async () => {
        mockSOClient.delete.mockRejectedValue(
          SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Forbidden'))
        );

        await expect(
          mockRouter.callRoute({
            params: {
              id: '1',
            },
          })
        ).resolves.toEqual(undefined);

        expect(mockRouter.response.customError).toHaveBeenCalledWith({
          statusCode: 403,
          body: {
            message: 'Forbidden',
          },
        });
      });
    });
  });
});
