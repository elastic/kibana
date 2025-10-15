/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getAnonymizationFieldsBulkActionRequest, requestMock } from '../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION } from '@kbn/elastic-assistant-common';
import {
  getEmptyFindResult,
  getFindAnonymizationFieldsResultWithSingleHit,
} from '../../__mocks__/response';
import { authenticatedUser } from '../../__mocks__/user';
import { bulkActionAnonymizationFieldsRoute } from './bulk_actions_route';
import {
  getAnonymizationFieldMock,
  getCreateAnonymizationFieldSchemaMock,
  getPerformBulkActionSchemaMock,
  getUpdateAnonymizationFieldSchemaMock,
} from '../../__mocks__/anonymization_fields_schema.mock';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

describe('Perform bulk action route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const mockAnonymizationField = getAnonymizationFieldMock(getUpdateAnonymizationFieldSchemaMock());
  const mockUser1 = authenticatedUser;

  beforeEach(async () => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getFindAnonymizationFieldsResultWithSingleHit())
    );
    (
      (await clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.getWriter())
        .bulk as jest.Mock
    ).mockResolvedValue({
      docs_created: [mockAnonymizationField, mockAnonymizationField],
      docs_updated: [mockAnonymizationField, mockAnonymizationField],
      docs_deleted: [],
      errors: [],
    });
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    bulkActionAnonymizationFieldsRoute(server.router, logger);
  });

  describe('status codes', () => {
    it('returns 200 when performing bulk action with all dependencies present', async () => {
      clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValueOnce(
        Promise.resolve(getEmptyFindResult())
      );
      const response = await server.inject(
        getAnonymizationFieldsBulkActionRequest(
          [getCreateAnonymizationFieldSchemaMock()],
          [getUpdateAnonymizationFieldSchemaMock('49403909-ca9b-49ba-9d7a-7e5320e68d04')],
          ['99403909-ca9b-49ba-9d7a-7e5320e68d05']
        ),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        success: true,
        anonymization_fields_count: 3,
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

  describe('anonymization fields bulk actions failures', () => {
    it('returns partial failure error if update of few anonymization fields fail', async () => {
      (
        (await clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.getWriter())
          .bulk as jest.Mock
      ).mockResolvedValue({
        docs_created: [mockAnonymizationField],
        docs_updated: [],
        docs_deleted: [],
        errors: [
          {
            message: 'mocked validation message',
            document: { id: 'failed-anonymization-field-id-1', name: 'Detect Root/Admin Users' },
          },
          {
            message: 'mocked validation message',
            document: { id: 'failed-anonymization-field-id-2', name: 'Detect Root/Admin Users' },
          },
          {
            message: 'test failure',
            document: { id: 'failed-anonymization-field-id-3', name: 'Detect Root/Admin Users' },
          },
        ],
        total: 4,
      });
      clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValueOnce(
        Promise.resolve(getEmptyFindResult())
      );
      const response = await server.inject(
        getAnonymizationFieldsBulkActionRequest(
          [getCreateAnonymizationFieldSchemaMock()],
          [getUpdateAnonymizationFieldSchemaMock('49403909-ca9b-49ba-9d7a-7e5320e68d04')],
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
              anonymization_fields: [
                {
                  id: 'failed-anonymization-field-id-1',
                  name: '',
                },
              ],
              status_code: 500,
            },
            {
              message: 'mocked validation message',
              anonymization_fields: [
                {
                  id: 'failed-anonymization-field-id-2',
                  name: '',
                },
              ],
              status_code: 500,
            },
            {
              message: 'test failure',
              anonymization_fields: [
                {
                  id: 'failed-anonymization-field-id-3',
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
        path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
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
        path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('accepts payloads with all operations', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });
  });

  describe('Anonymization fields bulk actions route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        (
          (
            await spaceClients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.getWriter()
          ).bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [mockAnonymizationField],
          docs_updated: [],
          docs_deleted: [],
          errors: [],
          total: 1,
        });
        spaceClients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValueOnce(
          Promise.resolve(getEmptyFindResult())
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const spaceServer = serverMock.create();
        bulkActionAnonymizationFieldsRoute(spaceServer.router, logger);

        const response = await spaceServer.inject(
          getAnonymizationFieldsBulkActionRequest([], [], ['dummy-id-1']),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(response.body.success).toBe(true);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });
    });

    describe('space isolation', () => {
      it('should only perform bulk actions on anonymization fields in the current space', async () => {
        // Setup space1 with anonymization fields to bulk edit
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        (
          (
            await space1Clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.getWriter()
          ).bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [],
          docs_updated: [{ id: 'space1-field-1' }, { id: 'space1-field-2' }],
          docs_deleted: [],
          errors: [],
          total: 2,
        });
        space1Clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValueOnce(
          Promise.resolve(getEmptyFindResult())
        );
        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        // Setup space2 with different anonymization fields
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        (
          (
            await space2Clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.getWriter()
          ).bulk as jest.Mock
        ).mockResolvedValue({
          docs_created: [],
          docs_updated: [{ id: 'space2-field-1' }],
          docs_deleted: [],
          errors: [],
          total: 1,
        });
        space2Clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValueOnce(
          Promise.resolve(getEmptyFindResult())
        );
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        bulkActionAnonymizationFieldsRoute(space1Server.router, logger);
        bulkActionAnonymizationFieldsRoute(space2Server.router, logger);

        // Perform bulk action in space1
        const space1Response = await space1Server.inject(
          getAnonymizationFieldsBulkActionRequest([], [], ['dummy-id-1']),
          requestContextMock.convertContext(space1Context)
        );

        // Perform bulk action in space2
        const space2Response = await space2Server.inject(
          getAnonymizationFieldsBulkActionRequest([], [], ['dummy-id-1']),
          requestContextMock.convertContext(space2Context)
        );

        expect(space1Response.status).toEqual(200);
        expect(space2Response.status).toEqual(200);

        // Verify each space operated on different anonymization fields
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
