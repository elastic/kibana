/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { requestContextMock } from '../../../__mocks__/request_context';
import { serverMock } from '../../../__mocks__/server';
import {
  getBasicEmptySearchResponse,
  getEmptyFindResult,
  getFindKnowledgeBaseEntriesResultWithSingleHit,
} from '../../../__mocks__/response';
import { getBulkActionKnowledgeBaseEntryRequest, requestMock } from '../../../__mocks__/request';
import {
  documentEntry,
  getCreateKnowledgeBaseEntrySchemaMock,
  getKnowledgeBaseEntryMock,
  getQueryKnowledgeBaseEntryParams,
  getUpdateKnowledgeBaseEntrySchemaMock,
} from '../../../__mocks__/knowledge_base_entry_schema.mock';
import { ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION } from '@kbn/elastic-assistant-common';
import { bulkActionKnowledgeBaseEntriesRoute } from './bulk_actions_route';
import { authenticatedUser } from '../../../__mocks__/user';

const date = '2023-03-28T22:27:28.159Z';
// @ts-ignore
const { kbResource, namespace, ...entrySansResource } = getUpdateKnowledgeBaseEntrySchemaMock('1');
const { id, ...documentEntrySansId } = documentEntry;

describe('Bulk actions knowledge base entry route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  const mockBulk = jest.fn().mockResolvedValue({
    errors: [],
    docs_created: [],
    docs_deleted: [],
    docs_updated: [],
    took: 0,
  });
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    // @ts-ignore
    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.options = {
      manageGlobalKnowledgeBaseAIAssistant: true,
    };

    // @ts-ignore
    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.getWriter.mockResolvedValue({
      bulk: mockBulk,
    });

    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getEmptyFindResult())
    ); // no current knowledge base entries
    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.createKnowledgeBaseEntry.mockResolvedValue(
      getKnowledgeBaseEntryMock(getQueryKnowledgeBaseEntryParams())
    ); // creation succeeds

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    bulkActionKnowledgeBaseEntriesRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200 with a knowledge base entry created via AIAssistantKnowledgeBaseDataClient', async () => {
      const response = await server.inject(
        getBulkActionKnowledgeBaseEntryRequest({
          create: [getCreateKnowledgeBaseEntrySchemaMock()],
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(mockBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          documentsToCreate: [
            {
              ...documentEntrySansId,
              '@timestamp': '2023-03-28T22:27:28.159Z',
              created_at: '2023-03-28T22:27:28.159Z',
              updated_at: '2023-03-28T22:27:28.159Z',
              namespace: 'default',
              required: false,
            },
          ],
          authenticatedUser,
        })
      );
    });
    test('returns 200 with a knowledge base entry updated via AIAssistantKnowledgeBaseDataClient', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
        Promise.resolve(getFindKnowledgeBaseEntriesResultWithSingleHit())
      );

      const response = await server.inject(
        getBulkActionKnowledgeBaseEntryRequest({
          update: [getUpdateKnowledgeBaseEntrySchemaMock('1')],
        }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(mockBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          documentsToUpdate: [
            {
              ...entrySansResource,
              required: false,
              kb_resource: kbResource,
              updated_at: '2023-03-28T22:27:28.159Z',
              updated_by: authenticatedUser.profile_uid,
              users: [
                {
                  id: authenticatedUser.profile_uid,
                  name: authenticatedUser.username,
                },
              ],
            },
          ],
          authenticatedUser,
        })
      );
    });
    test('returns 200 with a knowledge base entry deleted via AIAssistantKnowledgeBaseDataClient', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
        Promise.resolve(getFindKnowledgeBaseEntriesResultWithSingleHit())
      );

      const response = await server.inject(
        getBulkActionKnowledgeBaseEntryRequest({
          delete: { ids: ['1'] },
        }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(mockBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          documentsToDelete: ['1'],
          authenticatedUser,
        })
      );
    });
    test('handles all three bulk update actions at once', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments
        .mockResolvedValueOnce(Promise.resolve(getEmptyFindResult()))
        .mockResolvedValue(Promise.resolve(getFindKnowledgeBaseEntriesResultWithSingleHit()));
      const response = await server.inject(
        getBulkActionKnowledgeBaseEntryRequest({
          create: [getCreateKnowledgeBaseEntrySchemaMock()],
          delete: { ids: ['1'] },
          update: [getUpdateKnowledgeBaseEntrySchemaMock('1')],
        }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(mockBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          documentsToCreate: [
            {
              ...documentEntrySansId,
              '@timestamp': '2023-03-28T22:27:28.159Z',
              created_at: '2023-03-28T22:27:28.159Z',
              updated_at: '2023-03-28T22:27:28.159Z',
              namespace: 'default',
              required: false,
            },
          ],
          documentsToUpdate: [
            {
              ...entrySansResource,
              required: false,
              kb_resource: kbResource,
              updated_at: '2023-03-28T22:27:28.159Z',
              updated_by: authenticatedUser.profile_uid,
              users: [
                {
                  id: authenticatedUser.profile_uid,
                  name: authenticatedUser.username,
                },
              ],
            },
          ],
          documentsToDelete: ['1'],
          authenticatedUser,
        })
      );
    });
    test('returns 401 Unauthorized when request context getCurrentUser is not defined', async () => {
      context.elasticAssistant.getCurrentUser.mockReturnValueOnce(null);
      const response = await server.inject(
        getBulkActionKnowledgeBaseEntryRequest({
          create: [getCreateKnowledgeBaseEntrySchemaMock()],
        }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(401);
    });
  });

  describe('unhappy paths', () => {
    test('catches error if creation throws', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getBulkActionKnowledgeBaseEntryRequest({
          create: [getCreateKnowledgeBaseEntrySchemaMock()],
        }),
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
    test('disallows wrong name type', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
        body: {
          create: [{ ...getCreateKnowledgeBaseEntrySchemaMock(), name: true }],
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
