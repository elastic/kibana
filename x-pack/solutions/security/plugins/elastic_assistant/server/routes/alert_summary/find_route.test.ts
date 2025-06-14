/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCurrentUserAlertSummaryRequest, requestMock } from '../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND } from '@kbn/elastic-assistant-common';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getFindAlertSummaryResultWithSingleHit } from '../../__mocks__/response';
import { findAlertSummaryRoute } from './find_route';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { getAlertSummaryMock } from '../../__mocks__/alert_summary.mock';

jest.mock('../../lib/prompt', () => ({
  ...jest.requireActual('../../lib/prompt'),
  getPrompt: jest.fn().mockResolvedValue('hello world'),
}));
describe('Find user prompts route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    const mockUser1 = {
      username: 'my_username',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser;

    clients.elasticAssistant.getAlertSummaryDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getFindAlertSummaryResultWithSingleHit())
    );
    logger = loggingSystemMock.createLogger();
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    (context.elasticAssistant.actions.getActionsClientWithRequest as jest.Mock) = jest
      .fn()
      .mockReturnValueOnce(actionsClientMock.create());
    findAlertSummaryRoute(server.router, logger);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getCurrentUserAlertSummaryRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        perPage: 1,
        page: 1,
        total: 1,
        data: [
          {
            ...getAlertSummaryMock(),
            createdBy: `elastic`,
            recommendedActions: 'do something',
            timestamp: '2019-12-13T16:40:33.400Z',
            updatedBy: `elastic`,
          },
        ],
        prompt: 'hello world',
      });
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAlertSummaryDataClient.findDocuments.mockRejectedValueOnce(
        new Error('Test error')
      );
      const response = await server.inject(
        getCurrentUserAlertSummaryRequest(),
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
          connector_id: '123',
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
        path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND,
        query: {
          connector_id: '123',
          page: 2,
          per_page: 20,
          sort_field: 'name1',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        `sort_field: Invalid enum value. Expected 'created_at' | 'updated_at', received 'name1'`
      );
    });

    test('ignores unknown query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND,
        query: {
          connector_id: '123',
          invalid_value: 'test 1',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });
  });
});
