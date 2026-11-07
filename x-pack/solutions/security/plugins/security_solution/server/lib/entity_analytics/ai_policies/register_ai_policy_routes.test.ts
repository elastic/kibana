/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { APP_ID } from '../../../../common';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';
import {
  AI_POLICIES_URL,
  AI_POLICY_STATUS_URL,
} from '../../../../common/entity_intelligence/ai_policies';
import type { AiPolicyInput } from '../../../../common/entity_intelligence/ai_policies';
import { requestContextMock } from '../../detection_engine/routes/__mocks__';
import { createAiPolicyDataClient, AiPolicyError } from './ai_policy_data_client';
import { registerAiPolicyRoutes } from './register_ai_policy_routes';

jest.mock('./ai_policy_data_client', () => ({
  ...jest.requireActual('./ai_policy_data_client'),
  createAiPolicyDataClient: jest.fn(),
}));

const input: AiPolicyInput = {
  name: 'Fixture access',
  description: '',
  enabled: true,
  mode: 'monitor',
  providers: ['cursor'],
  activityType: 'protected_file_access',
  severity: 'high',
  toolNames: [],
  inputContains: 'protected-fixture.txt',
};

describe('AI policy routes', () => {
  const dataClient = {
    listPolicies: jest.fn(),
    createPolicy: jest.fn(),
    updatePolicy: jest.fn(),
    getStatus: jest.fn(),
    saveStatus: jest.fn(),
  };
  const router = httpServiceMock.createRouter();
  const logger = loggingSystemMock.createLogger();
  const clients = requestContextMock.createTools().clients;
  const contextMock = requestContextMock.create(clients);
  const context = requestContextMock.convertContext(contextMock);
  const response = httpServerMock.createResponseFactory();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createAiPolicyDataClient).mockReturnValue(dataClient);
    clients.core.security.authc.getCurrentUser.mockReturnValue({
      username: 'actual-user',
    } as never);
    contextMock.securitySolution.getSpaceId.mockReturnValue('research');
    registerAiPolicyRoutes({ router, logger });
  });

  it('requires EA access to read, and EA management to edit policies or report health', () => {
    for (const [config] of router.versioned.get.mock.calls) {
      expect(config.security).toEqual({
        authz: { requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`] },
      });
    }
    for (const [config] of [
      ...router.versioned.post.mock.calls,
      ...router.versioned.put.mock.calls,
    ]) {
      expect(config.security).toEqual({
        authz: { requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics-manage`] },
      });
    }
  });

  it('uses the current user ES client and derives the author from authenticated context', async () => {
    const { handler } = router.versioned.getRoute('post', AI_POLICIES_URL).versions[
      API_VERSIONS.internal.v1
    ];
    await handler(context, httpServerMock.createKibanaRequest({ body: input }), response);
    expect(createAiPolicyDataClient).toHaveBeenCalledWith({
      esClient: clients.core.elasticsearch.client.asCurrentUser,
      spaceId: 'research',
    });
    expect(dataClient.createPolicy).toHaveBeenCalledWith(input, 'actual-user');
    expect(clients.core.elasticsearch.client.asInternalUser.index).not.toHaveBeenCalled();
  });

  it('refuses a write without an authenticated username', async () => {
    clients.core.security.authc.getCurrentUser.mockReturnValue(null);
    const { handler } = router.versioned.getRoute('post', AI_POLICIES_URL).versions[
      API_VERSIONS.internal.v1
    ];
    await handler(context, httpServerMock.createKibanaRequest({ body: input }), response);
    expect(response.unauthorized).toHaveBeenCalled();
    expect(dataClient.createPolicy).not.toHaveBeenCalled();
  });

  it('returns a recoverable 409 when a policy was edited by another user', async () => {
    dataClient.updatePolicy.mockRejectedValue(new AiPolicyError('Reload the policy.', 409));
    const { handler } = router.versioned.getRoute('put', `${AI_POLICIES_URL}/{id}`).versions[
      API_VERSIONS.internal.v1
    ];
    await handler(
      context,
      httpServerMock.createKibanaRequest({
        params: { id: 'policy-id' },
        body: { ...input, expectedVersion: 1 },
      }),
      response
    );
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: 'Reload the policy.',
    });
  });

  it('preserves denied access errors rather than showing an empty healthy policy list', async () => {
    dataClient.listPolicies.mockRejectedValue({ statusCode: 403, body: { message: 'Forbidden' } });
    const { handler } = router.versioned.getRoute('get', AI_POLICIES_URL).versions[
      API_VERSIONS.internal.v1
    ];
    await handler(context, httpServerMock.createKibanaRequest(), response);
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns an absent collector as absent, without manufacturing health', async () => {
    dataClient.getStatus.mockResolvedValue({ status: null, stale: true });
    const { handler } = router.versioned.getRoute('get', AI_POLICY_STATUS_URL).versions[
      API_VERSIONS.internal.v1
    ];
    await handler(context, httpServerMock.createKibanaRequest(), response);
    expect(response.ok).toHaveBeenCalledWith({ body: { status: null, stale: true } });
  });
});
