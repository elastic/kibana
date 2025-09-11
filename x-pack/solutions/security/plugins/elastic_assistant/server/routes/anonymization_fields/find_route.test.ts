/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCurrentUserAnonymizationFieldsRequest, requestMock } from '../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND } from '@kbn/elastic-assistant-common';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getFindAnonymizationFieldsResultWithSingleHit } from '../../__mocks__/response';
import { findAnonymizationFieldsRoute } from './find_route';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

describe('Find user anonymization fields route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const mockUser = {
    username: 'elastic',
    authentication_realm: {
      type: 'my_realm_type',
      name: 'my_realm_name',
    },
  } as AuthenticatedUser;

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getFindAnonymizationFieldsResultWithSingleHit())
    );
    context.elasticAssistant.getCurrentUser.mockResolvedValue({
      username: 'elastic',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser);
    logger = loggingSystemMock.createLogger();
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
    findAnonymizationFieldsRoute(server.router, logger);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getCurrentUserAnonymizationFieldsRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockRejectedValueOnce(
        new Error('Test error')
      );
      const response = await server.inject(
        getCurrentUserAnonymizationFieldsRequest(),
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
        path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'created_at',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid sort fields', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'name',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        `sort_field: Invalid enum value. Expected 'created_at' | 'anonymized' | 'allowed' | 'field' | 'updated_at', received 'name'`
      );
    });

    test('ignores unknown query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
        query: {
          invalid_value: 'test 1',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });
  });

  describe('Find anonymization fields route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        spaceClients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValue(
          Promise.resolve({
            total: 1,
            perPage: 100,
            page: 1,
            data: {
              took: 1,
              timed_out: false,
              _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
              hits: {
                total: { value: 1, relation: 'eq' },
                max_score: 1,
                hits: [
                  {
                    _id: 'space1-anon-field',
                    _source: { id: 'space1-anon-field', field: 'user.name', allowed: true },
                  },
                ],
              },
            },
          })
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);

        const spaceServer = serverMock.create();
        findAnonymizationFieldsRoute(spaceServer.router, logger);

        const response = await spaceServer.inject(
          getCurrentUserAnonymizationFieldsRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });
    });

    describe('space isolation', () => {
      it('should only find anonymization fields in the current space', async () => {
        // Setup space1 with anonymization fields
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        space1Clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValue(
          Promise.resolve({
            total: 1,
            perPage: 100,
            page: 1,
            data: {
              took: 1,
              timed_out: false,
              _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
              hits: {
                total: { value: 1, relation: 'eq' },
                max_score: 1,
                hits: [
                  {
                    _id: 'space1-anon-field',
                    _source: { id: 'space1-anon-field', field: 'space1.user.name', allowed: true },
                  },
                ],
              },
            },
          })
        );

        // Setup space2 with different anonymization fields
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        space2Clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValue(
          Promise.resolve({
            total: 1,
            perPage: 100,
            page: 1,
            data: {
              took: 1,
              timed_out: false,
              _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
              hits: {
                total: { value: 1, relation: 'eq' },
                max_score: 1,
                hits: [
                  {
                    _id: 'space2-anon-field',
                    _source: {
                      id: 'space2-anon-field',
                      field: 'space2.user.email',
                      allowed: false,
                    },
                  },
                ],
              },
            },
          })
        );

        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        findAnonymizationFieldsRoute(space1Server.router, logger);
        findAnonymizationFieldsRoute(space2Server.router, logger);

        const space1Response = await space1Server.inject(
          getCurrentUserAnonymizationFieldsRequest(),
          requestContextMock.convertContext(space1Context)
        );

        const space2Response = await space2Server.inject(
          getCurrentUserAnonymizationFieldsRequest(),
          requestContextMock.convertContext(space2Context)
        );

        expect(space1Response.status).toEqual(200);
        expect(space2Response.status).toEqual(200);

        // Verify each space got its own anonymization fields
        expect(space1Response.body.data[0].field).toBe('space1.user.name');
        expect(space2Response.body.data[0].field).toBe('space2.user.email');

        expect(space1Context.elasticAssistant.getSpaceId()).toBe('space1');
        expect(space2Context.elasticAssistant.getSpaceId()).toBe('space2');
      });
    });
  });
});
