/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { requestContextMock } from '../../../__mocks__/request_context';
import { serverMock } from '../../../__mocks__/server';
import { updateKnowledgeBaseEntryRoute } from './update_route';
import {
  getBasicEmptySearchResponse,
  getEmptyFindResult,
  getFindKnowledgeBaseEntriesResultWithSingleHit,
} from '../../../__mocks__/response';
import { getUpdateKnowledgeBaseEntryRequest, requestMock } from '../../../__mocks__/request';
import {
  getKnowledgeBaseEntryMock,
  getQueryKnowledgeBaseEntryParams,
  getUpdateKnowledgeBaseEntrySchemaMock,
} from '../../../__mocks__/knowledge_base_entry_schema.mock';
import { authenticatedUser } from '../../../__mocks__/user';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL } from '@kbn/elastic-assistant-common';

describe('Update knowledge base entry route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = authenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getEmptyFindResult())
    ); // no current conversations
    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.updateKnowledgeBaseEntry.mockResolvedValue(
      {
        errors: [],
        updatedEntry: getKnowledgeBaseEntryMock(getQueryKnowledgeBaseEntryParams(true)),
      }
    ); // creation succeeds

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser1);
    updateKnowledgeBaseEntryRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200 with a conversation updated via AIAssistantKnowledgeBaseDataClient', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
        Promise.resolve(getFindKnowledgeBaseEntriesResultWithSingleHit())
      );

      const response = await server.inject(
        getUpdateKnowledgeBaseEntryRequest({
          params: { id: '1' },
          body: getKnowledgeBaseEntryMock(getQueryKnowledgeBaseEntryParams(true)),
        }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 401 Unauthorized when request context getCurrentUser is not defined', async () => {
      context.elasticAssistant.getCurrentUser.mockReturnValueOnce(null);
      const response = await server.inject(
        getUpdateKnowledgeBaseEntryRequest({
          params: { id: '1' },
          body: getKnowledgeBaseEntryMock(getQueryKnowledgeBaseEntryParams(true)),
        }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(401);
    });
  });

  describe('unhappy paths', () => {
    test('catches error if update throws', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.updateKnowledgeBaseEntry.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getUpdateKnowledgeBaseEntryRequest({
          params: { id: '1' },
          body: getKnowledgeBaseEntryMock(getQueryKnowledgeBaseEntryParams(true)),
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
    test('disallows POST request', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        params: {
          id: '1',
        },
        body: {
          ...getUpdateKnowledgeBaseEntrySchemaMock(),
          name: true,
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
