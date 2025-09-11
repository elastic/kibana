/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import { authenticatedUser } from '../../__mocks__/user';
import { readConversationRoute } from './read_route';
import { getConversationReadRequest, requestMock } from '../../__mocks__/request';
import {
  getConversationMock,
  getQueryConversationParams,
} from '../../__mocks__/conversations_schema.mock';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID } from '@kbn/elastic-assistant-common';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

describe('Read conversation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = authenticatedUser;

  const myFakeId = '99403909-ca9b-49ba-9d7a-7e5320e68d05';
  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    );
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    readConversationRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getConversationReadRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 200 when reading a single conversation outcome === exactMatch', async () => {
      const response = await server.inject(
        getConversationReadRequest(myFakeId),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getConversationReadRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    test('returns 401 Unauthorized when request context getCurrentUser is not defined', async () => {
      context.elasticAssistant.getCurrentUser.mockResolvedValueOnce(null);
      const response = await server.inject(
        getConversationReadRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(401);
    });
  });

  describe('data validation', () => {
    test('returns 404 if given a non-existent id', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        null
      );
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        params: { id: '99403909-ca9b-49ba-9d7a-7e5320e68d05' },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'conversation id: "99403909-ca9b-49ba-9d7a-7e5320e68d05" not found',
        status_code: 404,
      });
    });
  });

  describe('telemetry', () => {
    beforeEach(() => {
      context.elasticAssistant.telemetry.reportEvent = jest.fn();
    });

    test('does NOT call telemetry.reportEvent when user is the owner', async () => {
      const response = await server.inject(
        getConversationReadRequest('conv1'),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(context.elasticAssistant.telemetry.reportEvent).not.toHaveBeenCalled();
    });

    test('calls telemetry.reportEvent when user is NOT the owner', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        {
          ...getConversationMock(getQueryConversationParams()),
          id: 'conv2',
          createdBy: { name: 'not you' },
        }
      );
      const response = await server.inject(
        getConversationReadRequest('conv2'),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(context.elasticAssistant.telemetry.reportEvent).toHaveBeenCalled();
    });
  });

  describe('Read conversation route with Spaces', () => {
    let spaceAwareServer: ReturnType<typeof serverMock.create>;
    let spaceClients: typeof clients;
    let spaceContext: typeof context;

    beforeEach(() => {
      spaceAwareServer = serverMock.create();
      ({ clients: spaceClients, context: spaceContext } = requestContextMock.createTools());
    });

    describe('non-default space behavior', () => {
      beforeEach(() => {
        // Override the space ID for these tests
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          getConversationMock(getQueryConversationParams())
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
        readConversationRoute(spaceAwareServer.router);
      });

      it('should work correctly in non-default space', async () => {
        const response = await spaceAwareServer.inject(
          getConversationReadRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(spaceContext.elasticAssistant.getSpaceId).toHaveBeenCalled();
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });

      it('should handle errors in non-default space', async () => {
        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockImplementation(
          async () => {
            throw new Error('Space-specific test error');
          }
        );

        const response = await spaceAwareServer.inject(
          getConversationReadRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(500);
        expect(response.body.message).toBe('Space-specific test error');
      });

      it('should return 404 for non-existent conversation in non-default space', async () => {
        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          null
        );

        const response = await spaceAwareServer.inject(
          getConversationReadRequest(myFakeId),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(404);
        expect(response.body.message).toContain('not found');
      });
    });

    describe('space isolation', () => {
      it('should not access conversations from other spaces', async () => {
        // Setup space1 context with a conversation
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        const space1Conversation = getConversationMock({
          ...getQueryConversationParams(),
          id: 'space1-conversation-id',
          title: 'Space1 Conversation',
        });

        // Setup space2 context - should not find space1's conversation
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);

        space1Clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          space1Conversation
        );
        space2Clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          null // Space2 should not find space1's conversation
        );

        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        // Create separate servers for each space
        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        readConversationRoute(space1Server.router);
        readConversationRoute(space2Server.router);

        // Try to read the conversation from space1
        const space1Response = await space1Server.inject(
          getConversationReadRequest('space1-conversation-id'),
          requestContextMock.convertContext(space1Context)
        );

        // Try to read the same conversation ID from space2 (should fail)
        const space2Response = await space2Server.inject(
          getConversationReadRequest('space1-conversation-id'),
          requestContextMock.convertContext(space2Context)
        );

        // Space1 should successfully find the conversation
        expect(space1Response.status).toEqual(200);
        expect(space1Response.body.title).toBe('Space1 Conversation');

        // Space2 should not find the conversation
        expect(space2Response.status).toEqual(404);
        expect(space2Response.body.message).toContain('not found');

        // Verify correct space IDs were used
        expect(space1Context.elasticAssistant.getSpaceId()).toBe('space1');
        expect(space2Context.elasticAssistant.getSpaceId()).toBe('space2');
      });
    });
  });
});
