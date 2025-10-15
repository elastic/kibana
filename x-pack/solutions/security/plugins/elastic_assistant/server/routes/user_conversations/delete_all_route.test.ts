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
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

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

  describe('Delete all conversations route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.deleteAllConversations.mockResolvedValue(
          {
            total: 5,
          }
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(authenticatedUser);

        const spaceServer = serverMock.create();
        deleteAllConversationsRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getDeleteAllConversationsRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(response.body.totalDeleted).toEqual(5);
        expect(response.body.success).toBe(true);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });

      it('should handle errors in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.alternativeSpace)(spaceContext);

        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.deleteAllConversations.mockRejectedValue(
          new Error('Space-specific deletion error')
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(authenticatedUser);

        const spaceServer = serverMock.create();
        deleteAllConversationsRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getDeleteAllConversationsRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(500);
        expect(response.body.message).toBe('Space-specific deletion error');
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(
          spaceTestScenarios.alternativeSpace
        );
      });
    });

    describe('space isolation', () => {
      it('should only delete conversations from the current space', async () => {
        // Setup space1 with conversations to delete
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        space1Clients.elasticAssistant.getAIAssistantConversationsDataClient.deleteAllConversations.mockResolvedValue(
          {
            total: 3,
          }
        );
        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(authenticatedUser);

        // Setup space2 with different conversations
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        space2Clients.elasticAssistant.getAIAssistantConversationsDataClient.deleteAllConversations.mockResolvedValue(
          {
            total: 2,
          }
        );
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(authenticatedUser);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        deleteAllConversationsRoute(space1Server.router);
        deleteAllConversationsRoute(space2Server.router);

        // Delete all conversations from space1
        const space1Response = await space1Server.inject(
          getDeleteAllConversationsRequest(),
          requestContextMock.convertContext(space1Context)
        );

        // Delete all conversations from space2
        const space2Response = await space2Server.inject(
          getDeleteAllConversationsRequest(),
          requestContextMock.convertContext(space2Context)
        );

        expect(space1Response.status).toEqual(200);
        expect(space2Response.status).toEqual(200);

        // Verify each space deleted only its own conversations
        expect(space1Response.body.totalDeleted).toEqual(3);
        expect(space1Response.body.success).toBe(true);
        expect(space2Response.body.totalDeleted).toEqual(2);
        expect(space2Response.body.success).toBe(true);

        expect(space1Context.elasticAssistant.getSpaceId()).toBe('space1');
        expect(space2Context.elasticAssistant.getSpaceId()).toBe('space2');
      });
    });
  });
});
