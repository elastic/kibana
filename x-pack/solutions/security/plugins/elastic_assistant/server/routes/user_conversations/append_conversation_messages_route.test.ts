/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES } from '@kbn/elastic-assistant-common';
import { getAppendConversationMessageRequest, requestMock } from '../../__mocks__/request';
import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import {
  getAppendConversationMessagesSchemaMock,
  getConversationMock,
  getQueryConversationParams,
  getUpdateConversationSchemaMock,
} from '../../__mocks__/conversations_schema.mock';
import { authenticatedUser } from '../../__mocks__/user';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';
import { appendConversationMessageRoute } from './append_conversation_messages_route';

describe('Append conversation messages route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = authenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    );
    clients.elasticAssistant.getAIAssistantConversationsDataClient.appendConversationMessages.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    ); // successful append
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

    appendConversationMessageRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getAppendConversationMessageRequest('04128c15-0d1b-4716-a4c5-46997ac7f3bd'),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });
    test('adds user to message', async () => {
      await server.inject(
        getAppendConversationMessageRequest('04128c15-0d1b-4716-a4c5-46997ac7f3bd'),
        requestContextMock.convertContext(context)
      );
      expect(
        clients.elasticAssistant.getAIAssistantConversationsDataClient.appendConversationMessages
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            {
              content: 'test content',
              role: 'user',
              timestamp: '2019-12-13T16:40:33.400Z',
              traceData: { transactionId: '2', traceId: '1' },
              user: { id: 'my_profile_uid', name: 'elastic' },
            },
          ],
        })
      );
    });

    test('returns 404 when append to a conversation that does not exist', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        null
      );

      const response = await server.inject(
        getAppendConversationMessageRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'conversation id: "04128c15-0d1b-4716-a4c5-46997ac7f3bd" not found',
        status_code: 404,
      });
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getAppendConversationMessageRequest(),
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
    test('rejects payloads with no ID', async () => {
      const noIdRequest = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES,
        body: {
          ...getAppendConversationMessagesSchemaMock(),
          id: undefined,
        },
      });
      const response = await server.validate(noIdRequest);
      expect(response.badRequest).toHaveBeenCalled();
    });

    test('allows messages only', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES,
        body: {
          ...getAppendConversationMessagesSchemaMock(),
          apiConfig: {
            defaultSystemPromptId: 'test',
          },
        },
        params: { id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid message "role" value', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES,
        body: {
          ...getUpdateConversationSchemaMock(),
          messages: [
            {
              role: 'invalid',
              content: 'test',
              timestamp: '2019-12-13T16:40:33.400Z',
            },
          ],
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        `messages.0.role: Invalid enum value. Expected 'system' | 'user' | 'assistant', received 'invalid'`
      );
    });
  });

  describe('Append conversation messages route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        const updatedConversation = getConversationMock(getQueryConversationParams());
        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          updatedConversation
        );
        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.appendConversationMessages.mockResolvedValue(
          updatedConversation
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const spaceServer = serverMock.create();
        appendConversationMessageRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getAppendConversationMessageRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });

      it('should handle 404 for non-existent conversation in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.alternativeSpace)(spaceContext);

        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.appendConversationMessages.mockResolvedValue(
          null
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const spaceServer = serverMock.create();
        appendConversationMessageRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getAppendConversationMessageRequest('nonexistent-id'),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(404);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(
          spaceTestScenarios.alternativeSpace
        );
      });
    });

    describe('space isolation', () => {
      it('should not append messages to conversations from other spaces', async () => {
        // Setup space1 context with conversation
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        const space1Conversation = {
          ...getConversationMock(getQueryConversationParams()),
          id: 'space1-conversation',
        };
        space1Clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          space1Conversation
        );
        space1Clients.elasticAssistant.getAIAssistantConversationsDataClient.appendConversationMessages.mockResolvedValue(
          space1Conversation
        );
        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        // Setup space2 context - should not find space1's conversation
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        space2Clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
          null
        );
        space2Clients.elasticAssistant.getAIAssistantConversationsDataClient.appendConversationMessages.mockResolvedValue(
          null
        );
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        appendConversationMessageRoute(space1Server.router);
        appendConversationMessageRoute(space2Server.router);

        // Append message to conversation from space1 (should succeed)
        const space1Response = await space1Server.inject(
          getAppendConversationMessageRequest('space1-conversation'),
          requestContextMock.convertContext(space1Context)
        );

        // Try to append message to same conversation from space2 (should fail with 404)
        const space2Response = await space2Server.inject(
          getAppendConversationMessageRequest('space1-conversation'),
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
