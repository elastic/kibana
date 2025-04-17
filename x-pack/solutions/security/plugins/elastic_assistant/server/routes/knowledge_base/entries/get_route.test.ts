/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKnowledgeBaseEntryGetRequest } from '../../../__mocks__/request';
import { serverMock } from '../../../__mocks__/server';
import { requestContextMock } from '../../../__mocks__/request_context';
import {
  getEmptyFindResult,
  getFindKnowledgeBaseEntriesResultWithSingleHit,
} from '../../../__mocks__/response';
import { getKnowledgeBaseEntryRoute } from './get_route';
import type { AuthenticatedUser } from '@kbn/core-security-common';
const mockUser = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

describe('Get Knowledge Base Entry route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
    getKnowledgeBaseEntryRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200 if entry exists', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
        Promise.resolve(getFindKnowledgeBaseEntriesResultWithSingleHit())
      );
      const response = await server.inject(
        getKnowledgeBaseEntryGetRequest('04128c15-0d1b-4716-a4c5-46997ac7f3bd'),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 404 if entry does not exists', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockResolvedValue(
        Promise.resolve(getEmptyFindResult())
      );
      const response = await server.inject(
        getKnowledgeBaseEntryGetRequest('04128c15-0d1b-4716-a4c5-46997ac7f3bd'),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(404);
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantKnowledgeBaseDataClient.findDocuments.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getKnowledgeBaseEntryGetRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });
});
