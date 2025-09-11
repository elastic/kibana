/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { bulkActionConversationsRoute } from './bulk_actions_route';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { authenticatedUser } from '../../__mocks__/user';
import { getConversationsBulkActionRequest, requestMock } from '../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION } from '@kbn/elastic-assistant-common';
import {
  getFindConversationsResultWithSingleHit,
  getEmptyFindResult,
} from '../../__mocks__/response';
import {
  getConversationMock,
  getCreateConversationSchemaMock,
  getPerformBulkActionSchemaMock,
  getUpdateConversationSchemaMock,
} from '../../__mocks__/conversations_schema.mock';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

describe('Perform bulk action route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const mockConversation = getConversationMock(getUpdateConversationSchemaMock());
  const mockUser1 = authenticatedUser;

  beforeEach(async () => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getFindConversationsResultWithSingleHit())
    );
    (
      (await clients.elasticAssistant.getAIAssistantConversationsDataClient.getWriter())
        .bulk as jest.Mock
    ).mockResolvedValue({
      docs_created: [mockConversation, mockConversation],
      docs_updated: [mockConversation, mockConversation],
      docs_deleted: [],
      errors: [],
    });
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    bulkActionConversationsRoute(server.router, logger);
  });

  describe('status codes', () => {
    it('returns 200 when performing bulk action with all dependencies present', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.findDocuments.mockResolvedValueOnce(
        Promise.resolve(getEmptyFindResult())
      );
      const response = await server.inject(
        getConversationsBulkActionRequest(
          [getCreateConversationSchemaMock()],
          [getUpdateConversationSchemaMock('49403909-ca9b-49ba-9d7a-7e5320e68d04')],
          ['99403909-ca9b-49ba-9d7a-7e5320e68d05']
        ),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        success: true,
        conversations_count: 3,
        attributes: {
          results: someBulkActionResults(),
          summary: {
            failed: 0,
            skipped: 0,
            succeeded: 3,
            total: 3,
          },
        },
      });
    });
  });

  describe('conversations bulk actions failures', () => {
    it('returns partial failure error if update of few conversations fail', async () => {
      (
        (await clients.elasticAssistant.getAIAssistantConversationsDataClient.getWriter())
          .bulk as jest.Mock
      ).mockResolvedValue({
        docs_created: ['49403909-ca9b-49ba-9d7a-7e5320e68d04'],
        docs_updated: [],
        docs_deleted: [],
        errors: [
          {
            message: 'mocked validation message',
            document: { id: 'failed-conversation-id-1', name: 'Detect Root/Admin Users' },
          },
          {
            message: 'mocked validation message',
            document: { id: 'failed-conversation-id-2', name: 'Detect Root/Admin Users' },
          },
          {
            message: 'test failure',
            document: { id: 'failed-conversation-id-3', name: 'Detect Root/Admin Users' },
          },
        ],
        total: 5,
      });
      clients.elasticAssistant.getAIAssistantConversationsDataClient.findDocuments.mockResolvedValueOnce(
        Promise.resolve(getEmptyFindResult())
      );
      const response = await server.inject(
        getConversationsBulkActionRequest(
          [getCreateConversationSchemaMock()],
          [getUpdateConversationSchemaMock('49403909-ca9b-49ba-9d7a-7e5320e68d04')],
          ['99403909-ca9b-49ba-9d7a-7e5320e68d05']
        ),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: {
          summary: {
            failed: 3,
            succeeded: 1,
            skipped: 0,
            total: 4,
          },
          errors: [
            {
              message: 'mocked validation message',
              conversations: [
                {
                  id: 'failed-conversation-id-1',
                  name: '',
                },
              ],
              status_code: 500,
            },
            {
              message: 'mocked validation message',
              conversations: [
                {
                  id: 'failed-conversation-id-2',
                  name: '',
                },
              ],
              status_code: 500,
            },
            {
              message: 'test failure',
              conversations: [
                {
                  id: 'failed-conversation-id-3',
                  name: '',
                },
              ],
              status_code: 500,
            },
          ],
          results: someBulkActionResults(),
        },
        message: 'Bulk edit partially failed',
      });
    });
  });

  describe('request validation', () => {
    it('rejects payloads with no ids in delete operation', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
        body: { ...getPerformBulkActionSchemaMock(), delete: { ids: [] } },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        'delete.ids: Array must contain at least 1 element(s)'
      );
    });

    it('accepts payloads with only delete action', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('accepts payloads with all operations', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('rejects payload if there is more than 100 deletes in payload', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
        body: {
          ...getPerformBulkActionSchemaMock(),
          delete: { ids: Array.from({ length: 101 }).map(() => 'fake-id') },
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual('More than 100 ids sent for bulk edit action.');
    });
  });

  describe('Bulk actions route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        (
          (await spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.getWriter())
            .bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [mockConversation],
          docs_updated: [mockConversation],
          docs_deleted: [],
          errors: [],
        });
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(authenticatedUser);

        const spaceServer = serverMock.create();
        bulkActionConversationsRoute(spaceServer.router, logger);

        const response = await spaceServer.inject(
          getConversationsBulkActionRequest([], [], ['dummy-id-1']),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(response.body.success).toBe(true);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });

      it('should handle partial failures in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.alternativeSpace)(spaceContext);

        (
          (await spaceClients.elasticAssistant.getAIAssistantConversationsDataClient.getWriter())
            .bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [],
          docs_updated: [mockConversation],
          docs_deleted: [],
          errors: [
            {
              message: 'Space-specific error',
              document: { id: 'failed-conversation-id', name: 'Failed Conversation' },
            },
          ],
        });
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(authenticatedUser);

        const spaceServer = serverMock.create();
        bulkActionConversationsRoute(spaceServer.router, logger);

        const response = await spaceServer.inject(
          getConversationsBulkActionRequest([], [], ['dummy-id-1']),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(500);
        expect(response.body.attributes.errors).toHaveLength(1);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(
          spaceTestScenarios.alternativeSpace
        );
      });
    });

    describe('space isolation', () => {
      it('should only perform bulk actions on conversations in the current space', async () => {
        // Setup space1 with conversations to bulk edit
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        (
          (await space1Clients.elasticAssistant.getAIAssistantConversationsDataClient.getWriter())
            .bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [],
          docs_updated: [],
          docs_deleted: ['space1-conv-1', 'space1-conv-2'],
          errors: [],
        });
        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(authenticatedUser);

        // Setup space2 with different conversations
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        (
          (await space2Clients.elasticAssistant.getAIAssistantConversationsDataClient.getWriter())
            .bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [],
          docs_updated: [],
          docs_deleted: ['space2-conv-1'],
          errors: [],
        });
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(authenticatedUser);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        bulkActionConversationsRoute(space1Server.router, logger);
        bulkActionConversationsRoute(space2Server.router, logger);

        // Perform bulk action in space1
        const space1Response = await space1Server.inject(
          getConversationsBulkActionRequest([], [], ['dummy-id-1']),
          requestContextMock.convertContext(space1Context)
        );

        // Perform bulk action in space2
        const space2Response = await space2Server.inject(
          getConversationsBulkActionRequest([], [], ['dummy-id-1']),
          requestContextMock.convertContext(space2Context)
        );

        expect(space1Response.status).toEqual(200);
        expect(space2Response.status).toEqual(200);

        // Verify each space operated on different conversations
        expect(space1Response.body.attributes.results.deleted).toHaveLength(2);
        expect(space2Response.body.attributes.results.deleted).toHaveLength(1);

        expect(space1Context.elasticAssistant.getSpaceId()).toBe('space1');
        expect(space2Context.elasticAssistant.getSpaceId()).toBe('space2');
      });
    });
  });
});

function someBulkActionResults() {
  return {
    created: expect.any(Array),
    deleted: expect.any(Array),
    updated: expect.any(Array),
    skipped: expect.any(Array),
  };
}
