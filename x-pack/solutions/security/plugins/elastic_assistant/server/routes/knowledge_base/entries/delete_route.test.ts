/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { requestContextMock } from '../../../__mocks__/request_context';
import { serverMock } from '../../../__mocks__/server';
import { deleteKnowledgeBaseEntryRoute } from './delete_route';
import { getBasicEmptySearchResponse, getEmptyFindResult } from '../../../__mocks__/response';
import { getDeleteKnowledgeBaseEntryRequest, requestMock } from '../../../__mocks__/request';
import { authenticatedUser } from '../../../__mocks__/user';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID } from '@kbn/elastic-assistant-common';

describe('Delete knowledge base entry route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = authenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getEmptyFindResult())
    ); // no current conversations
    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.deleteKnowledgeBaseEntry.mockResolvedValue(
      { errors: [], docsDeleted: ['04128c15-0d1b-4716-a4c5-46997ac7f3bd'] }
    ); // creation succeeds

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser1);
    deleteKnowledgeBaseEntryRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200 with a conversation deleted via AIAssistantKnowledgeBaseDataClient', async () => {
      const response = await server.inject(
        getDeleteKnowledgeBaseEntryRequest({ id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 401 Unauthorized when request context getCurrentUser is not defined', async () => {
      context.elasticAssistant.getCurrentUser.mockReturnValueOnce(null);
      const response = await server.inject(
        getDeleteKnowledgeBaseEntryRequest({ id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(401);
    });
  });

  describe('unhappy paths', () => {
    test('catches error if deletion throws', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.deleteKnowledgeBaseEntry.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getDeleteKnowledgeBaseEntryRequest({ id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' }),
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
        method: 'delete',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        params: {
          id: '',
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
