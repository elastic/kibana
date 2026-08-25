/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import { getDeleteAllConversationsRequest } from '../../__mocks__/request';
import { authenticatedUser } from '../../__mocks__/user';
import { deleteAllConversationsRoute } from './delete_all_route';

describe('Delete all conversations route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = authenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.deleteAllConversations.mockResolvedValue(
      {
        total: 1,
      }
    );
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    deleteAllConversationsRoute(server.router);
  });

  describe('status codes with getAIAssistantConversationsDataClient', () => {
    test('returns 200 when deleting all conversations', async () => {
      const response = await server.inject(
        getDeleteAllConversationsRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
    });

    test('returns failure if exists', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.deleteAllConversations.mockResolvedValue(
        {
          total: 0,
          failures: [
            {
              id: 'error-id',
              index: 'test-index',
              status: 400,
              cause: {
                reason: 'Test error',
                type: 'Error',
              },
            },
          ],
        }
      );

      const response = await server.inject(
        getDeleteAllConversationsRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        success: false,
        totalDeleted: 0,
        failures: ['Test error'],
      });
    });

    test('catches error if deletion throws error', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.deleteAllConversations.mockRejectedValue(
        new Error('Test error')
      );
      const response = await server.inject(
        getDeleteAllConversationsRequest(),
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
