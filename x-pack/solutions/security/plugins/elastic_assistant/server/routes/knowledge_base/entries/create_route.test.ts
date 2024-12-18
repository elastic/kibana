/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { requestContextMock } from '../../../__mocks__/request_context';
import { serverMock } from '../../../__mocks__/server';
import { createKnowledgeBaseEntryRoute } from './create_route';
import { getBasicEmptySearchResponse, getEmptyFindResult } from '../../../__mocks__/response';
import { getCreateKnowledgeBaseEntryRequest, requestMock } from '../../../__mocks__/request';
import {
  getCreateKnowledgeBaseEntrySchemaMock,
  getKnowledgeBaseEntryMock,
  getQueryKnowledgeBaseEntryParams,
} from '../../../__mocks__/knowledge_base_entry_schema.mock';
import { authenticatedUser } from '../../../__mocks__/user';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL } from '@kbn/elastic-assistant-common';

describe('Create knowledge base entry route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = authenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getEmptyFindResult())
    ); // no current conversations
    clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.createKnowledgeBaseEntry.mockResolvedValue(
      getKnowledgeBaseEntryMock(getQueryKnowledgeBaseEntryParams())
    ); // creation succeeds

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser1);
    createKnowledgeBaseEntryRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200 with a conversation created via AIAssistantKnowledgeBaseDataClient', async () => {
      const response = await server.inject(
        getCreateKnowledgeBaseEntryRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 401 Unauthorized when request context getCurrentUser is not defined', async () => {
      context.elasticAssistant.getCurrentUser.mockReturnValueOnce(null);
      const response = await server.inject(
        getCreateKnowledgeBaseEntryRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(401);
    });
  });

  describe('unhappy paths', () => {
    test('catches error if creation throws', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.createKnowledgeBaseEntry.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getCreateKnowledgeBaseEntryRequest(),
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
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateKnowledgeBaseEntrySchemaMock(),
          name: true,
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
