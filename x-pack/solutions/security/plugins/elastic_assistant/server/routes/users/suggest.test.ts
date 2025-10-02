/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuggestUsersRequest, requestMock } from '../../__mocks__/request';
import { ELASTIC_USERS_SUGGEST_URL } from '@kbn/elastic-assistant-common';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getSuggestUsersResponseMock } from '../../__mocks__/response';
import { suggestUsersRoute } from './suggest';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AuthenticatedUser } from '@kbn/core-security-common';

describe('Suggest users route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    const mockUser1 = {
      username: 'elastic',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser;

    (context.elasticAssistant.userProfile.suggest as jest.Mock).mockResolvedValue(
      Promise.resolve(getSuggestUsersResponseMock())
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
    suggestUsersRoute(server.router, logger);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getSuggestUsersRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(getSuggestUsersResponseMock());
    });

    test('catches error if search throws error', async () => {
      (context.elasticAssistant.userProfile.suggest as jest.Mock).mockRejectedValueOnce(
        new Error('Test error')
      );
      const response = await server.inject(
        getSuggestUsersRequest(),
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
    test('disallows invalid sort fields', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_USERS_SUGGEST_URL,
        body: {
          searchTerm: 123,
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        `searchTerm: Expected string, received number`
      );
    });
  });
});
