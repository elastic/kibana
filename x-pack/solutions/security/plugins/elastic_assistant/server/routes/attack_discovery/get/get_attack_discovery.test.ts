/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttackDiscoveryRoute } from './get_attack_discovery';

import { AuthenticatedUser } from '@kbn/core-security-common';
import { serverMock } from '../../../__mocks__/server';
import { requestContextMock } from '../../../__mocks__/request_context';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { AttackDiscoveryDataClient } from '../../../lib/attack_discovery/persistence';
import { transformESSearchToAttackDiscovery } from '../../../lib/attack_discovery/persistence/transforms/transforms';
import { getAttackDiscoverySearchEsMock } from '../../../__mocks__/attack_discovery_schema.mock';
import { getAttackDiscoveryRequest } from '../../../__mocks__/request';
import { getAttackDiscoveryStats, updateAttackDiscoveryLastViewedAt } from '../helpers/helpers';

jest.mock('../helpers/helpers', () => {
  const original = jest.requireActual('../helpers/helpers');

  return {
    ...original,
    getAttackDiscoveryStats: jest.fn(),
    updateAttackDiscoveryLastViewedAt: jest.fn(),
  };
});

const mockStats = {
  newConnectorResultsCount: 2,
  newDiscoveriesCount: 4,
  statsPerConnector: [
    {
      hasViewed: false,
      status: 'failed',
      count: 0,
      connectorId: 'my-bedrock-old',
    },
    {
      hasViewed: false,
      status: 'running',
      count: 1,
      connectorId: 'my-gen-ai',
    },
    {
      hasViewed: true,
      status: 'succeeded',
      count: 1,
      connectorId: 'my-gpt4o-ai',
    },
    {
      hasViewed: true,
      status: 'canceled',
      count: 1,
      connectorId: 'my-bedrock',
    },
    {
      hasViewed: false,
      status: 'succeeded',
      count: 4,
      connectorId: 'my-gen-a2i',
    },
  ],
};
const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const mockUser = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;
const mockDataClient = {
  findAttackDiscoveryByConnectorId: jest.fn(),
  updateAttackDiscovery: jest.fn(),
  createAttackDiscovery: jest.fn(),
  getAttackDiscovery: jest.fn(),
} as unknown as AttackDiscoveryDataClient;
const mockCurrentAd = transformESSearchToAttackDiscovery(getAttackDiscoverySearchEsMock())[0];
describe('getAttackDiscoveryRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser);
    context.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(mockDataClient);

    getAttackDiscoveryRoute(server.router);
    (updateAttackDiscoveryLastViewedAt as jest.Mock).mockResolvedValue(mockCurrentAd);
    (getAttackDiscoveryStats as jest.Mock).mockResolvedValue(mockStats);
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      getAttackDiscoveryRequest('connector-id'),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      data: mockCurrentAd,
      stats: mockStats,
    });
  });

  it('should handle missing authenticated user', async () => {
    context.elasticAssistant.getCurrentUser.mockReturnValue(null);
    const response = await server.inject(
      getAttackDiscoveryRequest('connector-id'),
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
      getAttackDiscoveryRequest('connector-id'),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Attack discovery data client not initialized',
      status_code: 500,
    });
  });

  it('should handle findAttackDiscoveryByConnectorId null response', async () => {
    (updateAttackDiscoveryLastViewedAt as jest.Mock).mockResolvedValue(null);
    const response = await server.inject(
      getAttackDiscoveryRequest('connector-id'),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      stats: mockStats,
    });
  });

  it('should handle findAttackDiscoveryByConnectorId error', async () => {
    (updateAttackDiscoveryLastViewedAt as jest.Mock).mockRejectedValue(new Error('Oh no!'));
    const response = await server.inject(
      getAttackDiscoveryRequest('connector-id'),
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
});
