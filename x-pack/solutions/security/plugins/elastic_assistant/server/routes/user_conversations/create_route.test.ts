/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import { createConversationRoute } from './create_route';
import { getBasicEmptySearchResponse, getEmptyFindResult } from '../../__mocks__/response';
import { getCreateConversationRequest, requestMock } from '../../__mocks__/request';
import {
  getCreateConversationSchemaMock,
  getConversationMock,
  getQueryConversationParams,
} from '../../__mocks__/conversations_schema.mock';
import { authenticatedUser } from '../../__mocks__/user';
import type { Message } from '@kbn/elastic-assistant-common';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL } from '@kbn/elastic-assistant-common';

describe('Create conversation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = authenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getEmptyFindResult())
    ); // no current conversations
    clients.elasticAssistant.getAIAssistantConversationsDataClient.createConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    ); // creation succeeds

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    createConversationRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200 with a conversation created via AIAssistantConversationsDataClient', async () => {
      const response = await server.inject(
        getCreateConversationRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 401 Unauthorized when request context getCurrentUser is not defined', async () => {
      context.elasticAssistant.getCurrentUser.mockResolvedValueOnce(null);
      const response = await server.inject(
        getCreateConversationRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(401);
    });
  });

  describe('unhappy paths', () => {
    test('catches error if creation throws', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.createConversation.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getCreateConversationRequest(),
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
    test('disallows unknown title', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateConversationSchemaMock(),
          title: true,
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
  describe('conversation containing messages', () => {
    const getMessage = (role: string = 'user') => ({
      role,
      content: 'test content',
      timestamp: '2019-12-13T16:40:33.400Z',
    });
    const defaultMessage = getMessage();

    test('is successful', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateConversationSchemaMock(),
          messages: [defaultMessage],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
    });

    test('fails when provided with an unsupported message role', async () => {
      const wrongMessage = getMessage('test_thing');

      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateConversationSchemaMock(),
          messages: [wrongMessage],
        },
      });
      const result = await server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        `messages.0.role: Invalid enum value. Expected 'system' | 'user' | 'assistant', received 'test_thing'`
      );
    });
  });
  describe('telemetry for duplicate conversations', () => {
    const duplicateTitle = '[Duplicate] Conversation';
    const userMessage: Message = {
      role: 'user',
      content: 'test content',
      timestamp: '2019-12-13T16:40:33.400Z',
      user: { name: authenticatedUser.username, id: authenticatedUser.profile_uid },
    };
    const otherUserMessage: Message = {
      role: 'user',
      content: 'test content',
      timestamp: '2019-12-13T16:40:33.400Z',
      user: { name: 'other', id: 'other-id' },
    };
    let telemetryReportEventSpy: jest.SpyInstance;

    beforeEach(() => {
      telemetryReportEventSpy = jest.spyOn(context.elasticAssistant.telemetry, 'reportEvent');
    });

    afterEach(() => {
      telemetryReportEventSpy.mockRestore();
    });

    test('calls telemetry.reportEvent with isSourceConversationOwner=true for duplicate title and owner', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.createConversation.mockResolvedValue(
        {
          ...getConversationMock(getQueryConversationParams()),
          title: duplicateTitle,
          messages: [userMessage],
        }
      );
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateConversationSchemaMock(),
          title: duplicateTitle,
          messages: [userMessage],
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      expect(telemetryReportEventSpy).toHaveBeenCalledWith('conversation_duplicated', {
        isSourceConversationOwner: true,
      });
    });

    test('calls telemetry.reportEvent with isSourceConversationOwner=false for duplicate title and non-owner', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.createConversation.mockResolvedValue(
        {
          ...getConversationMock(getQueryConversationParams()),
          title: duplicateTitle,
          messages: [otherUserMessage],
        }
      );
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateConversationSchemaMock(),
          title: duplicateTitle,
          messages: [otherUserMessage],
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      expect(telemetryReportEventSpy).toHaveBeenCalledWith('conversation_duplicated', {
        isSourceConversationOwner: false,
      });
    });

    test('does not call telemetry.reportEvent for non-duplicate title', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.createConversation.mockResolvedValue(
        {
          ...getConversationMock(getQueryConversationParams()),
          title: 'Regular Conversation',
          messages: [userMessage],
        }
      );
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateConversationSchemaMock(),
          title: 'Regular Conversation',
          messages: [userMessage],
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      expect(telemetryReportEventSpy).not.toHaveBeenCalled();
    });
  });
});
