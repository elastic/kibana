/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { User } from '@kbn/elastic-assistant-common';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID } from '@kbn/elastic-assistant-common';
import { getUpdateConversationRequest, requestMock } from '../../__mocks__/request';
import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import {
  getConversationMock,
  getQueryConversationParams,
  getUpdateConversationSchemaMock,
} from '../../__mocks__/conversations_schema.mock';
import { authenticatedUser } from '../../__mocks__/user';
import { updateConversationRoute } from './update_route';
import expect from 'expect';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';
import type { AuditLogger } from '@kbn/core-security-server';

describe('Update conversation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = authenticatedUser;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    );
    clients.elasticAssistant.getAIAssistantConversationsDataClient.updateConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    ); // successful update

    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    context.elasticAssistant.telemetry = analyticsServiceMock.createAnalyticsServiceSetup();
    context.elasticAssistant.auditLogger = { log: jest.fn() } as unknown as AuditLogger;
    updateConversationRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getUpdateConversationRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 404 when updating a single conversation that does not exist', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        null
      );

      const response = await server.inject(
        getUpdateConversationRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'conversation id: "04128c15-0d1b-4716-a4c5-46997ac7f3bd" not found',
        status_code: 404,
      });
    });

    test('returns 403 when updating a conversation that user does not own', async () => {
      context.elasticAssistant.getCurrentUser.mockResolvedValue({
        username: 'noone',
        profile_uid: 'noone',
      } as AuthenticatedUser);
      const response = await server.inject(
        getUpdateConversationRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message:
          'conversation id: "04128c15-0d1b-4716-a4c5-46997ac7f3bd". Updating a conversation is only allowed for the owner of the conversation.',
        status_code: 403,
      });
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getUpdateConversationRequest(),
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
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: {
          ...getUpdateConversationSchemaMock(),
          id: undefined,
        },
      });
      const response = await server.validate(noIdRequest);
      expect(response.badRequest).toHaveBeenCalled();
    });

    test('allows title, excludeFromLastConversationStorage, apiConfig, replacements and message', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: {
          title: 'test2',
          excludeFromLastConversationStorage: true,
          ...getUpdateConversationSchemaMock(),
          apiConfig: {
            actionTypeId: '.bedrock',
            connectorId: '123',
            defaultSystemPromptId: 'test',
          },
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid message "role" value', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
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

    // validate id is correct, check happens on L71 in update_route.ts
    test('validates id is correct', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: {
          ...getUpdateConversationSchemaMock(),
          id: 'invalid-id',
        },
        params: { id: 'real-id' },
      });
      await server.inject(request, requestContextMock.convertContext(context));

      expect(
        clients.elasticAssistant.getAIAssistantConversationsDataClient.updateConversation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationUpdateProps: expect.objectContaining({ id: 'real-id' }),
        })
      );
    });
  });

  describe('telemetry.reportEvent', () => {
    test('is called with correct args sharing is restricted', async () => {
      const users = [
        { name: 'owner', id: 'owner-id' },
        { name: 'user2', id: 'user2-id' },
        { name: 'user3', id: 'user3-id' },
      ];
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: { id: '123', users },
        params: { id: '123' },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
      expect(context.elasticAssistant.telemetry.reportEvent).toHaveBeenCalledWith(
        'conversation_shared_success',
        { sharing: 'restricted', total: users.length - 1 }
      );
    });

    test('is called with correct args sharing is private', async () => {
      const users = [{ name: 'owner', id: 'owner-id' }];
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: { id: '123', users },
        params: { id: '123' },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
      expect(context.elasticAssistant.telemetry.reportEvent).toHaveBeenCalledWith(
        'conversation_shared_success',
        {
          sharing: 'private',
        }
      );
    });

    test('is called with correct args sharing is shared (global)', async () => {
      const users: User[] = [];
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: { id: '123', users },
        params: { id: '123' },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
      expect(context.elasticAssistant.telemetry.reportEvent).toHaveBeenCalledWith(
        'conversation_shared_success',
        {
          sharing: 'shared',
        }
      );
    });

    test('is not called when users is not present', async () => {
      const request = getUpdateConversationRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
      expect(context.elasticAssistant.telemetry.reportEvent).not.toHaveBeenCalled();
    });
  });

  describe('auditLogger.log calls', () => {
    test('calls auditLogger.log on successful user sharing update', async () => {
      const users = [
        { id: 'user1', name: 'User One' },
        { id: 'user2', name: 'User Two' },
      ];
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: {
          ...getUpdateConversationSchemaMock(),
          users,
        },
        params: { id: 'real-id' },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      expect(context.elasticAssistant.auditLogger?.log).toHaveBeenCalled();
      expect(context.elasticAssistant.auditLogger?.log).toHaveBeenCalledWith({
        event: {
          action: 'security_assistant_conversation_restricted',
          category: ['database'],
          outcome: 'success',
          type: ['change'],
        },
        message:
          'User has restricted conversation [id=04128c15-0d1b-4716-a4c5-46997ac7f3bd, title="Welcome"] to users ([id=user1, name=User One], [id=user2, name=User Two])',
      });
    });

    test('calls auditLogger.log on error with users in request', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const users = [
        { id: 'user1', name: 'User One' },
        { id: 'user2', name: 'User Two' },
      ];
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: {
          ...getUpdateConversationSchemaMock(),
          users,
        },
        params: { id: 'real-id' },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      expect(context.elasticAssistant.auditLogger?.log).toHaveBeenCalled();
      expect(context.elasticAssistant.auditLogger?.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Test error',
        },
        event: {
          action: 'security_assistant_conversation_shared',
          category: ['database'],
          outcome: 'failure',
          type: ['change'],
        },
        message:
          'Failed attempt to share conversation [id=conversation-1] to users ([id=user1, name=User One], [id=user2, name=User Two])',
      });
    });
  });
});
