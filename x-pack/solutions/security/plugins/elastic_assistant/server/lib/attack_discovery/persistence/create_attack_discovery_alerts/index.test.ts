/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';

import { createAttackDiscoveryAlerts } from '.';
import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';
import { mockCreateAttackDiscoveryAlertsParams } from '../../../../__mocks__/mock_create_attack_discovery_alerts_params';

const ADHOC_ALERTS_INDEX = 'mock-index' as const;
const ruleDataClientMock = ruleRegistryMocks.createRuleDataClient(ADHOC_ALERTS_INDEX);

describe('createAttackDiscoveryAlerts', () => {
  const mockLogger = loggerMock.create();
  const mockNow = new Date('2025-04-24T17:36:25.812Z');
  const spaceId = 'default';
  const bulkMock = jest.fn();

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
      adhocAttackDiscoveryDataClient: ruleDataClientMock,
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockParams,
      logger: mockLogger,
      spaceId,
    });

    expect(result).toEqual([]);
  });

  it('throws an error if bulk insertion fails', async () => {
    bulkMock.mockResolvedValue({
      body: {
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
      },
    });
    (ruleDataClientMock.getWriter as jest.Mock).mockResolvedValue({ bulk: bulkMock });

    await expect(
      createAttackDiscoveryAlerts({
        adhocAttackDiscoveryDataClient: ruleDataClientMock,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
        logger: mockLogger,
        spaceId,
      })
    ).rejects.toThrow('Failed to bulk insert Attack discovery alerts');
  });

  it('logs an error if fetching created alerts fails', async () => {
    bulkMock.mockResolvedValue({
      body: {
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
      },
    });
    (ruleDataClientMock.getWriter as jest.Mock).mockResolvedValue({ bulk: bulkMock });

    const searchMock = jest.fn().mockRejectedValue(new Error('Search error'));
    (ruleDataClientMock.getReader as jest.Mock).mockReturnValue({ search: searchMock });

    await expect(
      createAttackDiscoveryAlerts({
        adhocAttackDiscoveryDataClient: ruleDataClientMock,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
        logger: mockLogger,
        spaceId,
      })
    ).rejects.toThrow('Search error');

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error getting created Attack discovery alerts')
    );
  });
});
