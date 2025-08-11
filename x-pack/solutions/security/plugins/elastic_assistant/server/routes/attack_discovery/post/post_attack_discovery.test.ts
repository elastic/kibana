/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { AttackDiscoveryPostRequestBody } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { performChecks } from '../../helpers';
import { updateAttackDiscoveryStatusToRunning } from '../helpers/helpers';
import { hasReadWriteAttackDiscoveryAlertsPrivileges } from '../helpers/index_privileges';
import { requestIsValid } from './helpers/request_is_valid';
import { AttackDiscoveryDataClient } from '../../../lib/attack_discovery/persistence';
import { transformESSearchToAttackDiscovery } from '../../../lib/attack_discovery/persistence/transforms/transforms';
import { getAttackDiscoverySearchEsMock } from '../../../__mocks__/attack_discovery_schema.mock';
import { serverMock } from '../../../__mocks__/server';
import { requestContextMock } from '../../../__mocks__/request_context';
import { postAttackDiscoveryRoute } from './post_attack_discovery';

const mockCurrentAd = transformESSearchToAttackDiscovery(getAttackDiscoverySearchEsMock())[0];
const runningAd = {
  ...mockCurrentAd,
  status: 'running',
};
import { postAttackDiscoveryRequest } from '../../../__mocks__/request';

jest.mock('../helpers/helpers', () => {
  const helpersOriginal = jest.requireActual('../helpers/helpers');
  return {
    ...helpersOriginal,
    updateAttackDiscoveryStatusToRunning: jest.fn(),
  };
});

jest.mock('../helpers/index_privileges', () => {
  const privilegesOriginal = jest.requireActual('../helpers/index_privileges');
  return {
    ...privilegesOriginal,
    hasReadWriteAttackDiscoveryAlertsPrivileges: jest.fn(),
  };
});

jest.mock('../../helpers', () => {
  const helpersModuleOriginal = jest.requireActual('../../helpers');
  return {
    ...helpersModuleOriginal,
    performChecks: jest.fn(),
  };
});

jest.mock('./helpers/request_is_valid', () => ({
  requestIsValid: jest.fn(),
}));

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const mockUser = {
  username: 'my_username',
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

const findAttackDiscoveryByConnectorId = jest.fn();
const mockDataClient = {
  findAttackDiscoveryByConnectorId,
  updateAttackDiscovery: jest.fn(),
  createAttackDiscovery: jest.fn(),
  getAttackDiscovery: jest.fn(),
  refreshEventLogIndex: jest.fn(),
} as unknown as AttackDiscoveryDataClient;

const mockRequestBody: AttackDiscoveryPostRequestBody = {
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
describe('postAttackDiscoveryRoute', () => {
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
  const invalidBody: AttackDiscoveryPostRequestBody = {
    ...mockRequestBody,
    alertsIndexPattern: '',
  };

  const response = await server.inject(
    postAttackDiscoveryRequest(invalidBody),
    requestContextMock.convertContext(context)
  );

  expect(response.status).toEqual(400);
});

it('returns 500 when feature flag check throws', async () => {
  context.core.featureFlags.getBooleanValue = jest.fn().mockImplementation(() => {
    throw new Error('Feature flag error');
  });

  const response = await server.inject(
    postAttackDiscoveryRequest(mockRequestBody),
    requestContextMock.convertContext(context)
  );

  expect(response.body).toEqual({
    message: {
      error: 'Feature flag error',
      success: false,
    },
    status_code: 500,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
  context.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(mockDataClient);
  context.elasticAssistant.actions = actionsMock.createStart();
  context.core.featureFlags.getBooleanValue = jest.fn().mockResolvedValue(false);
  postAttackDiscoveryRoute(server.router);
  findAttackDiscoveryByConnectorId.mockResolvedValue(mockCurrentAd);

  // Mock successful defaults
  (performChecks as jest.Mock).mockResolvedValue({ isSuccess: true });
  (requestIsValid as jest.Mock).mockReturnValue(true);
  (updateAttackDiscoveryStatusToRunning as jest.Mock).mockResolvedValue({
    currentAd: runningAd,
    attackDiscoveryId: mockCurrentAd.id,
  });
  (hasReadWriteAttackDiscoveryAlertsPrivileges as jest.Mock).mockResolvedValue({
    isSuccess: true,
  });
});

it('should handle successful request', async () => {
  const response = await server.inject(
    postAttackDiscoveryRequest(mockRequestBody),
    requestContextMock.convertContext(context)
  );
  expect(response.status).toEqual(200);
  expect(response.body).toEqual(runningAd);
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

it('should handle updateAttackDiscoveryStatusToRunning error', async () => {
  (updateAttackDiscoveryStatusToRunning as jest.Mock).mockRejectedValue(new Error('Oh no!'));
  const response = await server.inject(
    postAttackDiscoveryRequest(mockRequestBody),
    requestContextMock.convertContext(context)
  );
  expect(response.status).toEqual(500);
  expect(response.body).toEqual({
    message: {
      error: 'Oh no!',
      success: false,
    },
    status_code: 500,
  });
});

describe('Enabled `attackDiscoveryAlertsEnabled` feature flag', () => {
  beforeEach(() => {
    clients.core.featureFlags.getBooleanValue.mockResolvedValue(true);
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(runningAd);
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
