/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCurrentUserSecurityAIPromptsRequest, requestMock } from '../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND } from '@kbn/elastic-assistant-common';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { findSecurityAIPromptsRoute } from './find_prompts';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { getPromptsByGroupId } from '../../lib/prompt';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
jest.mock('../../lib/prompt');
const mockResponse = [{ promptId: 'systemPrompt', prompt: 'This is a prompt' }];
describe('Find security AI prompts route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    const mockUser1 = {
      username: 'my_username',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser;

    (getPromptsByGroupId as jest.Mock).mockResolvedValue(Promise.resolve(mockResponse));
    context.elasticAssistant.getCurrentUser.mockResolvedValueOnce({
      username: 'my_username',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser);
    (context.elasticAssistant.actions.getActionsClientWithRequest as jest.Mock) = jest
      .fn()
      .mockReturnValueOnce(actionsClientMock.create());
    logger = loggingSystemMock.createLogger();
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser1);
    findSecurityAIPromptsRoute(server.router, logger);
  });

  describe('status codes', () => {
    it('returns 200', async () => {
      const response = await server.inject(
        getCurrentUserSecurityAIPromptsRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ prompts: mockResponse });
    });

    it('catches error if search throws error', async () => {
      (getPromptsByGroupId as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      const response = await server.inject(
        getCurrentUserSecurityAIPromptsRequest(),
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
    it('allows optional query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND,
        query: {
          prompt_group_id: 'aiAssistant',
          prompt_ids: ['systemPrompt'],
          connector_id: '123',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('ignores unknown query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND,
        query: {
          prompt_group_id: 'aiAssistant',
          prompt_ids: ['systemPrompt'],
          invalid_value: 'test 1',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });
  });
});
