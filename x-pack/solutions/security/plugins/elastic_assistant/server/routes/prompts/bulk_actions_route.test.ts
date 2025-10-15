/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getPromptsBulkActionRequest, requestMock } from '../../__mocks__/request';
import { authenticatedUser } from '../../__mocks__/user';
import { ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION } from '@kbn/elastic-assistant-common';
import { getEmptyFindResult, getFindPromptsResultWithSingleHit } from '../../__mocks__/response';
import { bulkPromptsRoute } from './bulk_actions_route';
import {
  getCreatePromptSchemaMock,
  getPerformBulkActionSchemaMock,
  getPromptMock,
  getUpdatePromptSchemaMock,
} from '../../__mocks__/prompts_schema.mock';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

describe('Perform bulk action route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const mockPrompt = getPromptMock(getUpdatePromptSchemaMock());
  const mockUser1 = authenticatedUser;

  beforeEach(async () => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getFindPromptsResultWithSingleHit())
    );
    (
      (await clients.elasticAssistant.getAIAssistantPromptsDataClient.getWriter()).bulk as jest.Mock
    ).mockResolvedValue({
      docs_created: [mockPrompt, mockPrompt],
      docs_updated: [mockPrompt, mockPrompt],
      docs_deleted: [],
      errors: [],
    });
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    bulkPromptsRoute(server.router, logger);
  });

  describe('status codes', () => {
    it('returns 200 when performing bulk action with all dependencies present', async () => {
      clients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValueOnce(
        Promise.resolve(getEmptyFindResult())
      );
      const response = await server.inject(
        getPromptsBulkActionRequest(
          [getCreatePromptSchemaMock()],
          [getUpdatePromptSchemaMock('49403909-ca9b-49ba-9d7a-7e5320e68d04')],
          ['99403909-ca9b-49ba-9d7a-7e5320e68d05']
        ),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        success: true,
        prompts_count: 3,
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

  describe('prompts bulk actions failures', () => {
    it('returns partial failure error if update of few prompts fail', async () => {
      (
        (await clients.elasticAssistant.getAIAssistantPromptsDataClient.getWriter())
          .bulk as jest.Mock
      ).mockResolvedValue({
        docs_created: [mockPrompt],
        docs_updated: [],
        docs_deleted: [],
        errors: [
          {
            message: 'mocked validation message',
            document: { id: 'failed-prompt-id-1', name: 'Detect Root/Admin Users' },
          },
          {
            message: 'mocked validation message',
            document: { id: 'failed-prompt-id-2', name: 'Detect Root/Admin Users' },
          },
          {
            message: 'test failure',
            document: { id: 'failed-prompt-id-3', name: 'Detect Root/Admin Users' },
          },
        ],
        total: 4,
      });
      clients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValueOnce(
        Promise.resolve(getEmptyFindResult())
      );
      const response = await server.inject(
        getPromptsBulkActionRequest(
          [getCreatePromptSchemaMock()],
          [getUpdatePromptSchemaMock('49403909-ca9b-49ba-9d7a-7e5320e68d04')],
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
              prompts: [
                {
                  id: 'failed-prompt-id-1',
                  name: '',
                },
              ],
              status_code: 500,
            },
            {
              message: 'mocked validation message',
              prompts: [
                {
                  id: 'failed-prompt-id-2',
                  name: '',
                },
              ],
              status_code: 500,
            },
            {
              message: 'test failure',
              prompts: [
                {
                  id: 'failed-prompt-id-3',
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
        path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION,
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
        path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('accepts payloads with all operations', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('rejects payload if there is more than 100 deletes in payload', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION,
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

  describe('Prompts bulk actions route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        (
          (await spaceClients.elasticAssistant.getAIAssistantPromptsDataClient.getWriter())
            .bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [mockPrompt],
          docs_updated: [],
          docs_deleted: [],
          errors: [],
          total: 1,
        });
        spaceClients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValueOnce(
          Promise.resolve(getEmptyFindResult())
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const spaceServer = serverMock.create();
        bulkPromptsRoute(spaceServer.router, logger);

        const response = await spaceServer.inject(
          getPromptsBulkActionRequest([], [], ['dummy-id-1']),
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
          (await spaceClients.elasticAssistant.getAIAssistantPromptsDataClient.getWriter())
            .bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [],
          docs_updated: [],
          docs_deleted: [],
          errors: [{ message: 'Space-specific error', document: { id: 'failed-prompt' } }],
          total: 1,
        });
        spaceClients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValueOnce(
          Promise.resolve(getEmptyFindResult())
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const spaceServer = serverMock.create();
        bulkPromptsRoute(spaceServer.router, logger);

        const response = await spaceServer.inject(
          getPromptsBulkActionRequest([], [], ['dummy-id-1']),
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
      it('should only perform bulk actions on prompts in the current space', async () => {
        // Setup space1 with prompts to bulk edit
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        (
          (await space1Clients.elasticAssistant.getAIAssistantPromptsDataClient.getWriter())
            .bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [],
          docs_updated: [{ id: 'space1-prompt-1' }, { id: 'space1-prompt-2' }],
          docs_deleted: [],
          errors: [],
          total: 2,
        });
        space1Clients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValueOnce(
          Promise.resolve(getEmptyFindResult())
        );
        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        // Setup space2 with different prompts
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        (
          (await space2Clients.elasticAssistant.getAIAssistantPromptsDataClient.getWriter())
            .bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [],
          docs_updated: [{ id: 'space2-prompt-1' }],
          docs_deleted: [],
          errors: [],
          total: 1,
        });
        space2Clients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValueOnce(
          Promise.resolve(getEmptyFindResult())
        );
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        bulkPromptsRoute(space1Server.router, logger);
        bulkPromptsRoute(space2Server.router, logger);

        // Perform bulk action in space1
        const space1Response = await space1Server.inject(
          getPromptsBulkActionRequest([], [], ['dummy-id-1']),
          requestContextMock.convertContext(space1Context)
        );

        // Perform bulk action in space2
        const space2Response = await space2Server.inject(
          getPromptsBulkActionRequest([], [], ['dummy-id-1']),
          requestContextMock.convertContext(space2Context)
        );

        expect(space1Response.status).toEqual(200);
        expect(space2Response.status).toEqual(200);

        // Verify each space operated on different prompts
        expect(space1Response.body.attributes.results.updated).toHaveLength(2);
        expect(space2Response.body.attributes.results.updated).toHaveLength(1);

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
