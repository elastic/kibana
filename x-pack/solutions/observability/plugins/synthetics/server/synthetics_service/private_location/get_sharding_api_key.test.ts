/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SyntheticsServerSetup } from '../../types';
import { privateLocationShardingApiKeySavedObject } from '../../saved_objects/private_location_sharding_api_key';
import {
  generateAndSavePrivateLocationShardingApiKey,
  getPrivateLocationShardingApiKey,
} from './get_sharding_api_key';

const hasPrivileges = jest.fn();
const validate = jest.fn();
const grantAsInternalUser = jest.fn();

const server = {
  logger: loggerMock.create(),
  security: {
    authc: {
      apiKeys: {
        grantAsInternalUser,
        validate,
      },
    },
  },
  coreStart: {
    elasticsearch: {
      client: {
        asScoped: () => ({
          asCurrentUser: {
            security: { hasPrivileges },
          },
        }),
      },
    },
  },
} as unknown as SyntheticsServerSetup;

describe('private location sharding API key', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates and stores a dedicated key with minimal read privileges', async () => {
    const savedObjectsClient = {} as never;
    grantAsInternalUser.mockResolvedValue({
      id: 'key-id',
      name: 'synthetics-private-location-sharding',
      api_key: 'secret',
    });
    const set = jest
      .spyOn(privateLocationShardingApiKeySavedObject, 'set')
      .mockResolvedValue(undefined);

    await generateAndSavePrivateLocationShardingApiKey({
      server,
      request: {} as never,
      savedObjectsClient,
    });

    expect(grantAsInternalUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'synthetics-private-location-sharding',
        role_descriptors: {
          synthetics_private_location_sharding: {
            indices: [
              {
                names: ['synthetics-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        },
      })
    );
    expect(set).toHaveBeenCalledWith(savedObjectsClient, {
      id: 'key-id',
      name: 'synthetics-private-location-sharding',
      apiKey: 'secret',
    });
  });

  it('accepts a stored key only when it is valid and has both required privileges', async () => {
    jest.spyOn(privateLocationShardingApiKeySavedObject, 'get').mockResolvedValue({
      id: 'key-id',
      name: 'synthetics-private-location-sharding',
      apiKey: 'secret',
    });
    validate.mockResolvedValue(true);
    hasPrivileges.mockResolvedValue({
      index: {
        'synthetics-*': {
          read: true,
          view_index_metadata: true,
        },
      },
    });

    await expect(getPrivateLocationShardingApiKey({ server })).resolves.toMatchObject({
      apiKey: { id: 'key-id' },
      isValid: true,
    });
  });
});
