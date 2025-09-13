/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKnowledgeBaseEntryFindRequest, requestMock } from '../../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND } from '@kbn/elastic-assistant-common';
import { serverMock } from '../../../__mocks__/server';
import { requestContextMock } from '../../../__mocks__/request_context';
import { getFindKnowledgeBaseEntriesResultWithSingleHit } from '../../../__mocks__/response';
import { findKnowledgeBaseEntriesRoute } from './find_route';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { spaceTestScenarios, withSpace } from '../../../__mocks__/space_test_helpers';
const mockUser = {
  username: 'elastic',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

describe('Find Knowledge Base Entries route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    logger = loggingSystemMock.createLogger();
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getFindKnowledgeBaseEntriesResultWithSingleHit())
    );
    findKnowledgeBaseEntriesRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getKnowledgeBaseEntryFindRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getKnowledgeBaseEntryFindRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows optional query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'title',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid sort fields', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'name',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        `sort_field: Invalid enum value. Expected 'created_at' | 'is_default' | 'title' | 'updated_at', received 'name'`
      );
    });

    test('ignores unknown query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND,
        query: {
          invalid_value: 'test 1',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });
  });

  describe('Find knowledge base entries route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        spaceClients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
          Promise.resolve({
            total: 1,
            perPage: 100,
            page: 1,
            data: {
              took: 1,
              timed_out: false,
              _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
              hits: {
                total: { value: 1, relation: 'eq' },
                max_score: 1,
                hits: [
                  {
                    _id: 'space1-kb-entry',
                    _source: { id: 'space1-kb-entry', name: 'Space1 KB Entry' },
                  },
                ],
              },
            },
          })
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);

        const spaceServer = serverMock.create();
        findKnowledgeBaseEntriesRoute(spaceServer.router, logger);

        const response = await spaceServer.inject(
          getKnowledgeBaseEntryFindRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });
    });

    describe('space isolation', () => {
      it('should only find knowledge base entries in the current space', async () => {
        // Setup space1 with KB entries
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        space1Clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
          Promise.resolve({
            total: 1,
            perPage: 100,
            page: 1,
            data: {
              took: 1,
              timed_out: false,
              _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
              hits: {
                total: { value: 1, relation: 'eq' },
                max_score: 1,
                hits: [
                  {
                    _id: 'space1-kb-entry',
                    _source: { id: 'space1-kb-entry', name: 'Space1 KB Entry' },
                  },
                ],
              },
            },
          })
        );

        // Setup space2 with different KB entries
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        space2Clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
          Promise.resolve({
            total: 1,
            perPage: 100,
            page: 1,
            data: {
              took: 1,
              timed_out: false,
              _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
              hits: {
                total: { value: 1, relation: 'eq' },
                max_score: 1,
                hits: [
                  {
                    _id: 'space2-kb-entry',
                    _source: { id: 'space2-kb-entry', name: 'Space2 KB Entry' },
                  },
                ],
              },
            },
          })
        );

        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        findKnowledgeBaseEntriesRoute(space1Server.router, logger);
        findKnowledgeBaseEntriesRoute(space2Server.router, logger);

        const space1Response = await space1Server.inject(
          getKnowledgeBaseEntryFindRequest(),
          requestContextMock.convertContext(space1Context)
        );

        const space2Response = await space2Server.inject(
          getKnowledgeBaseEntryFindRequest(),
          requestContextMock.convertContext(space2Context)
        );

        expect(space1Response.status).toEqual(200);
        expect(space2Response.status).toEqual(200);

        // Verify each space got its own KB entries
        expect(space1Response.body.data).toHaveLength(1);
        expect(space2Response.body.data).toHaveLength(1);
        expect(space1Response.body.data[0]).toBeDefined();
        expect(space2Response.body.data[0]).toBeDefined();

        expect(space1Context.elasticAssistant.getSpaceId()).toBe('space1');
        expect(space2Context.elasticAssistant.getSpaceId()).toBe('space2');
      });
    });
  });
});
