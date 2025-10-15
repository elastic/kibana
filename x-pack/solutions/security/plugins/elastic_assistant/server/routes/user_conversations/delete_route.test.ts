/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID } from '@kbn/elastic-assistant-common';
import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import { deleteConversationRoute } from './delete_route';
import { getDeleteConversationRequest, requestMock } from '../../__mocks__/request';
import { authenticatedUser } from '../../__mocks__/user';
import {
  getConversationMock,
  getQueryConversationParams,
} from '../../__mocks__/conversations_schema.mock';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

describe('Delete conversation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = authenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    );
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    deleteConversationRoute(server.router);
  });

  describe('status codes with getAIAssistantConversationsDataClient', () => {
    test('returns 200 when deleting a single conversation with a valid getAIAssistantConversationsDataClient by Id', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        getConversationMock(getQueryConversationParams())
      );
      const response = await server.inject(
        getDeleteConversationRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
    });

    test('returns 404 when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        null
      );

      const response = await server.inject(
        getDeleteConversationRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'conversation id: "04128c15-0d1b-4716-a4c5-46997ac7f3bd" not found',
        status_code: 404,
      });
    });

    test('catches error if deletion throws error', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.deleteConversation.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getDeleteConversationRequest(),
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
    test('rejects a request with no id', async () => {
      const request = requestMock.create({
        method: 'delete',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        query: {},
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });

  describe('Delete conversation route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          getConversationMock(getQueryConversationParams())
        );
        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.deleteConversation.mockResolvedValue(
          1
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const spaceServer = serverMock.create();
        deleteConversationRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getDeleteConversationRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });

      it('should handle 404 for non-existent conversation in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.alternativeSpace)(spaceContext);

        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          null
        );
        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.deleteConversation.mockResolvedValue(
          0
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const spaceServer = serverMock.create();
        deleteConversationRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getDeleteConversationRequest('nonexistent-id'),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(404);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(
          spaceTestScenarios.alternativeSpace
        );
      });
    });

    describe('space isolation', () => {
      it('should not delete conversations from other spaces', async () => {
        // Setup space1 context with conversation that can be deleted
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        space1Clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          getConversationMock(getQueryConversationParams())
        );
        space1Clients.elasticAssistant.getAIAssistantConversationsDataClient.deleteConversation.mockResolvedValue(
          1
        );
        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        // Setup space2 context - should not find space1's conversation
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        space2Clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          null
        );
        space2Clients.elasticAssistant.getAIAssistantConversationsDataClient.deleteConversation.mockResolvedValue(
          0
        );
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        deleteConversationRoute(space1Server.router);
        deleteConversationRoute(space2Server.router);

        // Delete conversation from space1 (should succeed)
        const space1Response = await space1Server.inject(
          getDeleteConversationRequest('space1-conversation'),
          requestContextMock.convertContext(space1Context)
        );

        // Try to delete same conversation from space2 (should fail with 404)
        const space2Response = await space2Server.inject(
          getDeleteConversationRequest('space1-conversation'),
          requestContextMock.convertContext(space2Context)
        );

        expect(space1Response.status).toEqual(200);
        expect(space2Response.status).toEqual(404);
        expect(space1Context.elasticAssistant.getSpaceId()).toBe('space1');
        expect(space2Context.elasticAssistant.getSpaceId()).toBe('space2');
      });
    });
  });
});
