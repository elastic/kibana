/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCurrentUserPromptsRequest, requestMock } from '../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND } from '@kbn/elastic-assistant-common';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getFindPromptsResultWithSingleHit } from '../../__mocks__/response';
import { findPromptsRoute } from './find_route';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

describe('Find user prompts route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    const mockUser1 = {
      username: 'elastic',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser;

    clients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getFindPromptsResultWithSingleHit())
    );
    context.elasticAssistant.getCurrentUser.mockResolvedValueOnce({
      username: 'elastic',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser);
    logger = loggingSystemMock.createLogger();
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    findPromptsRoute(server.router, logger);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getCurrentUserPromptsRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockRejectedValueOnce(
        new Error('Test error')
      );
      const response = await server.inject(
        getCurrentUserPromptsRequest(),
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
        path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'name',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid sort fields', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'name1',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        `sort_field: Invalid enum value. Expected 'created_at' | 'is_default' | 'name' | 'updated_at', received 'name1'`
      );
    });

    test('ignores unknown query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND,
        query: {
          invalid_value: 'test 1',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });
  });

  describe('Find user prompts route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { clients: spaceClients, context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        const mockUser = {
          username: 'elastic',
          authentication_realm: { type: 'my_realm_type', name: 'my_realm_name' },
        } as AuthenticatedUser;

        spaceClients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValue(
          Promise.resolve(getFindPromptsResultWithSingleHit())
        );
        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);

        const spaceServer = serverMock.create();
        const spaceLogger = loggingSystemMock.createLogger();
        findPromptsRoute(spaceServer.router, spaceLogger);

        const response = await spaceServer.inject(
          getCurrentUserPromptsRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(spaceContext.elasticAssistant.getSpaceId).toHaveBeenCalled();
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });
    });

    describe('space isolation', () => {
      it('should only find prompts in the current space', async () => {
        // Setup space1 with space-specific prompts
        const { clients: space1Clients, context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        space1Clients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValue(
          Promise.resolve({
            total: 1,
            perPage: 100,
            page: 1,
            data: [{ id: 'space1-prompt', name: 'Space1 Prompt', isDefault: false }],
          })
        );

        // Setup space2 with different prompts
        const { clients: space2Clients, context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        space2Clients.elasticAssistant.getAIAssistantPromptsDataClient.findDocuments.mockResolvedValue(
          Promise.resolve({
            total: 1,
            perPage: 100, 
            page: 1,
            data: [{ id: 'space2-prompt', name: 'Space2 Prompt', isDefault: false }],
          })
        );

        const mockUser = {
          username: 'elastic',
          authentication_realm: { type: 'my_realm_type', name: 'my_realm_name' },
        } as AuthenticatedUser;

        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        const logger1 = loggingSystemMock.createLogger();
        const logger2 = loggingSystemMock.createLogger();
        findPromptsRoute(space1Server.router, logger1);
        findPromptsRoute(space2Server.router, logger2);

        const space1Response = await space1Server.inject(
          getCurrentUserPromptsRequest(),
          requestContextMock.convertContext(space1Context)
        );

        const space2Response = await space2Server.inject(
          getCurrentUserPromptsRequest(),
          requestContextMock.convertContext(space2Context)
        );

        expect(space1Response.status).toEqual(200);
        expect(space2Response.status).toEqual(200);

        // Verify each space got its own prompts
        expect(space1Response.body.data[0].name).toBe('Space1 Prompt');
        expect(space2Response.body.data[0].name).toBe('Space2 Prompt');

        expect(space1Context.elasticAssistant.getSpaceId()).toBe('space1');
        expect(space2Context.elasticAssistant.getSpaceId()).toBe('space2');
      });
    });
  });
});
