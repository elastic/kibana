/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsType } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { SyntheticsServiceApiKey } from '../../common/runtime_types/synthetics_service_api_key';
import type { SyntheticsServerSetup } from '../types';

const PRIVATE_LOCATION_SHARDING_API_KEY_ID = 'd5e4b09b-9c8a-4e85-b8f5-f5a922ceb39d';
const PRIVATE_LOCATION_SHARDING_API_KEY_TYPE = 'synthetics-private-location-sharding-api-key';
const privateLocationShardingApiKeySchemaV1 = schema.object({
  id: schema.string(),
  name: schema.string(),
  apiKey: schema.string(),
});

export const privateLocationShardingApiKey: SavedObjectsType = {
  name: PRIVATE_LOCATION_SHARDING_API_KEY_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      apiKey: {
        type: 'binary',
      },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: privateLocationShardingApiKeySchemaV1,
        forwardCompatibility: privateLocationShardingApiKeySchemaV1.extends(
          {},
          { unknowns: 'ignore' }
        ),
      },
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'uptimeApp',
    getTitle: () =>
      i18n.translate('xpack.synthetics.privateLocationSharding.apiKey', {
        defaultMessage: 'Synthetics private location sharding API key',
      }),
  },
};

const get = async (server: SyntheticsServerSetup) => {
  try {
    const encryptedClient = server.encryptedSavedObjects.getClient({
      includedHiddenTypes: [privateLocationShardingApiKey.name],
    });
    const object = await encryptedClient.getDecryptedAsInternalUser<SyntheticsServiceApiKey>(
      privateLocationShardingApiKey.name,
      PRIVATE_LOCATION_SHARDING_API_KEY_ID
    );
    return object.attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

const set = async (
  savedObjectsClient: SavedObjectsClientContract,
  apiKey: SyntheticsServiceApiKey
) => {
  await savedObjectsClient.create(privateLocationShardingApiKey.name, apiKey, {
    id: PRIVATE_LOCATION_SHARDING_API_KEY_ID,
    overwrite: true,
  });
};

const deleteApiKey = async (savedObjectsClient: SavedObjectsClientContract) => {
  try {
    await savedObjectsClient.delete(
      privateLocationShardingApiKey.name,
      PRIVATE_LOCATION_SHARDING_API_KEY_ID
    );
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw error;
    }
  }
};

export const privateLocationShardingApiKeySavedObject = {
  get,
  set,
  delete: deleteApiKey,
};
