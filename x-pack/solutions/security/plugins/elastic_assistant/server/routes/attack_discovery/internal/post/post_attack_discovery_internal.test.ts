/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { AttackDiscoveryPostInternalRequestBody } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { generateDepreciatedInternalApiResponse } from '../../public/post/helpers/generate_depreciated_internal_api_response';
import { performChecks } from '../../../helpers';
import { hasReadWriteAttackDiscoveryAlertsPrivileges } from '../../helpers/index_privileges';
import { requestIsValid } from '../../public/post/helpers/request_is_valid';
import type { AttackDiscoveryDataClient } from '../../../../lib/attack_discovery/persistence';
import { postAttackDiscoveryRequest } from '../../../../__mocks__/request';
import { serverMock } from '../../../../__mocks__/server';
import { requestContextMock } from '../../../../__mocks__/request_context';
import { postAttackDiscoveryInternalRoute } from './post_attack_discovery_internal';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'static-uuid'),
}));

jest.mock('../../helpers/index_privileges', () => {
  const privilegesOriginal = jest.requireActual('../../helpers/index_privileges');
  return {
    ...privilegesOriginal,
    hasReadWriteAttackDiscoveryAlertsPrivileges: jest.fn(),
  };
});

jest.mock('../../../helpers', () => {
  const helpersModuleOriginal = jest.requireActual('../../../helpers');
  return {
    ...helpersModuleOriginal,
    performChecks: jest.fn(),
  };
});

jest.mock('../../public/post/helpers/request_is_valid', () => ({
  requestIsValid: jest.fn(),
}));

jest.mock('../../helpers/generate_and_update_discoveries', () => ({
  generateAndUpdateAttackDiscoveries: jest.fn(),
}));

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const mockUser = {
  username: 'elastic',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
  lookup_realm: {
    type: 'my_lookup_type',
    name: 'my_lookup_name',
  },
  authentication_provider: { type: 'basic', name: 'basic1' },
  authentication_type: 'realm',
  elastic_cloud_user: false,
  enabled: true,
  roles: ['superuser'],
  full_name: 'Test User',
  email: 'test@example.com',
};

const mockApiConfig = {
  connectorId: 'connector-id',
  actionTypeId: '.bedrock',
  model: 'model',
  provider: OpenAiProviderType.OpenAi,
};

const mockDataClient = {
  updateAttackDiscovery: jest.fn(),
  createAttackDiscovery: jest.fn(),
  getAttackDiscovery: jest.fn(),
  refreshEventLogIndex: jest.fn(),
} as unknown as AttackDiscoveryDataClient;

const mockRequestBody: AttackDiscoveryPostInternalRequestBody = {
  subAction: 'invokeAI',
  apiConfig: mockApiConfig,
  alertsIndexPattern: 'alerts-*',
  anonymizationFields: [],
  replacements: {},
  model: 'gpt-4',
  size: 20,
  langSmithProject: 'langSmithProject',
  langSmithApiKey: 'langSmithApiKey',
};
describe('postAttackDiscoveryInternalRoute', () => {
  it('returns 403 when privilege check returns forbidden', async () => {
    context.core.featureFlags.getBooleanValue = jest.fn().mockResolvedValue(true);
    (hasReadWriteAttackDiscoveryAlertsPrivileges as jest.Mock).mockImplementation(
      ({ response }) => {
        return Promise.resolve({
          isSuccess: false,
          response: response.forbidden({ body: { message: 'forbidden' } }),
        });
      }
    );
    const response = await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(403);
  });
});

it('returns 400 when request body is missing required fields', async () => {
  (requestIsValid as jest.Mock).mockReturnValue(false);
  const invalidBody: AttackDiscoveryPostInternalRequestBody = {
    ...mockRequestBody,
    alertsIndexPattern: '',
  };

  const response = await server.inject(
    postAttackDiscoveryRequest(invalidBody),
    requestContextMock.convertContext(context)
  );

  expect(response.status).toEqual(400);
});

beforeEach(() => {
  jest.clearAllMocks();
  context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
  context.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(mockDataClient);
  context.elasticAssistant.actions = actionsMock.createStart();
  context.core.featureFlags.getBooleanValue = jest.fn().mockResolvedValue(false);
  postAttackDiscoveryInternalRoute(server.router);

  // Mock successful defaults
  (performChecks as jest.Mock).mockResolvedValue({ isSuccess: true });
  (requestIsValid as jest.Mock).mockReturnValue(true);
  (hasReadWriteAttackDiscoveryAlertsPrivileges as jest.Mock).mockResolvedValue({
    isSuccess: true,
  });

  // Mock generateAndUpdateAttackDiscoveries to resolve successfully
  const { generateAndUpdateAttackDiscoveries } = jest.requireMock(
    '../../helpers/generate_and_update_discoveries'
  );
  generateAndUpdateAttackDiscoveries.mockResolvedValue({
    anonymizedAlerts: [],
    attackDiscoveries: [],
    replacements: {},
  });

  jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

it('should handle successful request', async () => {
  const response = await server.inject(
    postAttackDiscoveryRequest(mockRequestBody),
    requestContextMock.convertContext(context)
  );

  expect(response.status).toEqual(200);
  expect(response.body).toEqual(generateDepreciatedInternalApiResponse());
});

it('should handle missing authenticated user', async () => {
  context.elasticAssistant.getCurrentUser.mockResolvedValueOnce(null);
  const response = await server.inject(
    postAttackDiscoveryRequest(mockRequestBody),
    requestContextMock.convertContext(context)
  );

  expect(response.status).toEqual(401);
  expect(response.body).toEqual({
    message: 'Authenticated user not found',
    status_code: 401,
  });
});

it('should handle missing data client', async () => {
  context.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(null);
  const response = await server.inject(
    postAttackDiscoveryRequest(mockRequestBody),
    requestContextMock.convertContext(context)
  );

  expect(response.status).toEqual(500);
  expect(response.body).toEqual({
    message: 'Attack discovery data client not initialized',
    status_code: 500,
  });
});

describe('request handling', () => {
  it('should handle successful request', async () => {
    const response = await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(generateDepreciatedInternalApiResponse());
  });

  it('calls generateAndUpdateAttackDiscoveries with withReplacements: false for this internal api', async () => {
    const { generateAndUpdateAttackDiscoveries } = jest.requireMock(
      '../../helpers/generate_and_update_discoveries'
    );

    // Make sure the mock is cleared
    generateAndUpdateAttackDiscoveries.mockClear();

    await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(generateAndUpdateAttackDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        withReplacements: false,
      })
    );
  });

  it('calls generateAndUpdateAttackDiscoveries with enableFieldRendering: true for this internal api', async () => {
    const { generateAndUpdateAttackDiscoveries } = jest.requireMock(
      '../../helpers/generate_and_update_discoveries'
    );

    // Make sure the mock is cleared
    generateAndUpdateAttackDiscoveries.mockClear();

    await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(generateAndUpdateAttackDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        enableFieldRendering: true,
      })
    );
  });

  it('should handle missing privileges', async () => {
    (hasReadWriteAttackDiscoveryAlertsPrivileges as jest.Mock).mockImplementation(
      ({ response }) => {
        return Promise.resolve({
          isSuccess: false,
          response: response.forbidden({ body: { message: 'no privileges' } }),
        });
      }
    );

    const response = await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(403);
    expect(response.body).toEqual({ message: 'no privileges' });
  });
});
