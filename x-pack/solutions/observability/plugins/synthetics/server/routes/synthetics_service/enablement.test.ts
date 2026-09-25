/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { disableSyntheticsRoute, getSyntheticsEnablementRoute } from './enablement';
import * as serviceApiKeyModule from '../../synthetics_service/get_api_key';
import * as shardingApiKeyModule from '../../synthetics_service/private_location/get_sharding_api_key';

const enablement = {
  canEnable: true,
  canManageApiKeys: true,
  isEnabled: true,
  isValidApiKey: true,
  areApiKeysEnabled: true,
};

const createContext = () => ({
  savedObjectsClient: {
    delete: jest.fn(),
  },
  request: {},
  server: {
    config: {},
    logger: loggerMock.create(),
    security: {
      authc: {
        apiKeys: {
          invalidateAsInternalUser: jest.fn(),
        },
      },
    },
  },
  syntheticsMonitorClient: {
    syntheticsService: {
      isAllowed: true,
      deleteAllConfigs: jest.fn(),
    },
  },
});

describe('getSyntheticsEnablementRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(serviceApiKeyModule, 'getSyntheticsEnablement').mockResolvedValue(enablement);
    jest
      .spyOn(serviceApiKeyModule, 'getAPIKeyForSyntheticsService')
      .mockResolvedValue({ isValid: false });
    jest
      .spyOn(shardingApiKeyModule, 'getPrivateLocationShardingApiKey')
      .mockResolvedValue({ isValid: false });
    jest
      .spyOn(shardingApiKeyModule, 'generateAndSavePrivateLocationShardingApiKey')
      .mockResolvedValue({
        id: 'sharding-key',
        name: 'synthetics-private-location-sharding',
        apiKey: 'secret',
      });
  });

  it('creates a dedicated sharding key on self-managed when no service key is available', async () => {
    const context = createContext();

    await getSyntheticsEnablementRoute().handler(context as never);

    expect(shardingApiKeyModule.generateAndSavePrivateLocationShardingApiKey).toHaveBeenCalledWith({
      request: context.request,
      savedObjectsClient: context.savedObjectsClient,
      server: context.server,
    });
  });

  it('reuses a valid service key instead of creating a dedicated sharding key', async () => {
    jest.spyOn(serviceApiKeyModule, 'getAPIKeyForSyntheticsService').mockResolvedValue({
      apiKey: { id: 'service-key', name: 'synthetics-service', apiKey: 'secret' },
      isValid: true,
    });

    await getSyntheticsEnablementRoute().handler(createContext() as never);

    expect(shardingApiKeyModule.getPrivateLocationShardingApiKey).not.toHaveBeenCalled();
    expect(
      shardingApiKeyModule.generateAndSavePrivateLocationShardingApiKey
    ).not.toHaveBeenCalled();
  });

  it('does not block self-managed enablement when the sharding key cannot be created', async () => {
    jest
      .spyOn(shardingApiKeyModule, 'generateAndSavePrivateLocationShardingApiKey')
      .mockRejectedValue(new Error('insufficient privileges'));

    await expect(
      getSyntheticsEnablementRoute().handler(createContext() as never)
    ).resolves.toMatchObject({
      isEnabled: true,
      isValidApiKey: true,
    });
  });

  it('invalidates the dedicated sharding key when Synthetics is disabled', async () => {
    const context = createContext();
    const ok = jest.fn().mockReturnValue({ status: 200 });
    jest.spyOn(shardingApiKeyModule, 'getPrivateLocationShardingApiKey').mockResolvedValue({
      apiKey: {
        id: 'sharding-key',
        name: 'synthetics-private-location-sharding',
        apiKey: 'secret',
      },
      isValid: true,
    });

    await disableSyntheticsRoute().handler({ ...context, response: { ok } } as never);

    expect(context.server.security.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
      ids: ['sharding-key'],
    });
  });
});
