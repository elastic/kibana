/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { createAttackDiscoveryAlerts } from '.';
import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';
import { mockCreateAttackDiscoveryAlertsParams } from '../../../../__mocks__/mock_create_attack_discovery_alerts_params';

describe('createAttackDiscoveryAlerts', () => {
  const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const mockLogger = loggerMock.create();
  const mockNow = new Date('2025-04-24T17:36:25.812Z');
  const spaceId = 'default';
  const attackDiscoveryAlertsIndex = 'mock-index';

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
  });

  it('returns an empty array if no alert documents are created', async () => {
    const mockParams = {
      ...mockCreateAttackDiscoveryAlertsParams,
      attackDiscoveries: [],
    };

    const result = await createAttackDiscoveryAlerts({
      attackDiscoveryAlertsIndex,
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockParams,
      esClient: mockEsClient,
      logger: mockLogger,
      spaceId,
    });

    expect(result).toEqual([]);
  });

  it('throws an error if bulk insertion fails', async () => {
    mockEsClient.bulk.mockResolvedValue({
      items: [
        {
          create: {
            _index: 'mock-index',
            status: 400,
            error: { reason: 'Test error', type: 'test_error' },
          },
        },
      ],
      errors: true,
      took: 1,
    });

    await expect(
      createAttackDiscoveryAlerts({
        attackDiscoveryAlertsIndex,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId,
      })
    ).rejects.toThrow('Failed to bulk insert Attack discovery alerts');
  });

  it('logs an error if fetching created alerts fails', async () => {
    mockEsClient.bulk.mockResolvedValue({
      items: [
        {
          create: {
            result: 'created',
            _id: 'mock-id-1',
            _index: 'mock-index',
            status: 201,
          },
        },
      ],
      errors: false,
      took: 1,
    });

    mockEsClient.search.mockRejectedValue(new Error('Search error'));

    await expect(
      createAttackDiscoveryAlerts({
        attackDiscoveryAlertsIndex,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId,
      })
    ).rejects.toThrow('Search error');

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error getting created Attack discovery alerts')
    );
  });
});
