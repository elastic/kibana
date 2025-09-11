/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type AuthenticatedUser } from '@kbn/core/server';
import { getCurrentUserFindRequest, requestMock } from '../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND } from '@kbn/elastic-assistant-common';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getFindConversationsResultWithSingleHit } from '../../__mocks__/response';
import { findUserConversationsRoute } from './find_route';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

describe('Find user conversations route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getFindConversationsResultWithSingleHit())
    );
    context.elasticAssistant.getCurrentUser.mockResolvedValue({
      username: 'elastic',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser);

    findUserConversationsRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getCurrentUserFindRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });
    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.findDocuments.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getCurrentUserFindRequest(),
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
    test('allows optional query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'title',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid sort fields', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'name',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        `sort_field: Invalid enum value. Expected 'created_at' | 'title' | 'updated_at', received 'name'`
      );
    });

    test('ignores unknown query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
        query: {
          invalid_value: 'test 1',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });
  });

  describe('Find user conversations route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.findDocuments.mockResolvedValue(
          Promise.resolve(getFindConversationsResultWithSingleHit())
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue({
          username: 'elastic',
          authentication_realm: {
            type: 'my_realm_type',
            name: 'my_realm_name',
          },
        } as AuthenticatedUser);

        const spaceServer = serverMock.create();
        findUserConversationsRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getCurrentUserFindRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(spaceContext.elasticAssistant.getSpaceId).toHaveBeenCalled();
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });
    });

    describe('space isolation', () => {
      it('should only find conversations in the current space', async () => {
        // Setup space1 with one conversation
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        space1Clients.elasticAssistant.getAIAssistantConversationsDataClient.findDocuments.mockResolvedValue(
          Promise.resolve({
            total: 1,
            perPage: 100,
            page: 1,
            data: [{ id: 'space1-conversation', title: 'Space1 Conversation' }],
          })
        );

        // Setup space2 with different conversation
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        space2Clients.elasticAssistant.getAIAssistantConversationsDataClient.findDocuments.mockResolvedValue(
          Promise.resolve({
            total: 1,
            perPage: 100,
            page: 1,
            data: [{ id: 'space2-conversation', title: 'Space2 Conversation' }],
          })
        );

        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue({
          username: 'elastic',
          authentication_realm: { type: 'my_realm_type', name: 'my_realm_name' },
        } as AuthenticatedUser);

        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue({
          username: 'elastic',
          authentication_realm: { type: 'my_realm_type', name: 'my_realm_name' },
        } as AuthenticatedUser);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        findUserConversationsRoute(space1Server.router);
        findUserConversationsRoute(space2Server.router);

        const space1Response = await space1Server.inject(
          getCurrentUserFindRequest(),
          requestContextMock.convertContext(space1Context)
        );

        const space2Response = await space2Server.inject(
          getCurrentUserFindRequest(),
          requestContextMock.convertContext(space2Context)
        );

        expect(space1Response.status).toEqual(200);
        expect(space2Response.status).toEqual(200);

        // Verify each space got its own results
        expect(space1Response.body.data[0].title).toBe('Space1 Conversation');
        expect(space2Response.body.data[0].title).toBe('Space2 Conversation');

        expect(space1Context.elasticAssistant.getSpaceId()).toBe('space1');
        expect(space2Context.elasticAssistant.getSpaceId()).toBe('space2');
      });
    });
  });
});
