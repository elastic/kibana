/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObjectsClientContract, SavedObjectsType } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SyntheticsServerSetup } from '../types';
import type { SyntheticsServiceApiKey } from '../../common/runtime_types/synthetics_service_api_key';

export const syntheticsApiKeyID = 'ba997842-b0cf-4429-aa9d-578d9bf0d391';
export const syntheticsApiKeyObjectType = 'uptime-synthetics-api-key';
const privateLocationShardingApiKeyID = 'd5e4b09b-9c8a-4e85-b8f5-f5a922ceb39d';

export const syntheticsServiceApiKey: SavedObjectsType = {
  name: syntheticsApiKeyObjectType,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      apiKey: {
        type: 'binary',
      },
      /* Leaving these commented to make it clear that these fields exist, even though we don't want them indexed.
         When adding new fields please add them here. If they need to be searchable put them in the uncommented
         part of properties.
      id: {
        type: 'keyword',
      },
      name: {
        type: 'long',
      },
      */
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'uptimeApp',
    getTitle: () =>
      i18n.translate('xpack.synthetics.synthetics.service.apiKey', {
        defaultMessage: 'Synthetics service api key',
      }),
  },
};

const getEncryptedSOClient = (server: SyntheticsServerSetup) => {
  const encryptedClient = server.encryptedSavedObjects.getClient({
    includedHiddenTypes: [syntheticsServiceApiKey.name],
  });
  return encryptedClient;
};

const getSyntheticsAPIKey = async (server: SyntheticsServerSetup, id: string) => {
  try {
    const soClient = getEncryptedSOClient(server);
    const obj = await soClient.getDecryptedAsInternalUser<SyntheticsServiceApiKey>(
      syntheticsServiceApiKey.name,
      id
    );
    return obj?.attributes;
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return undefined;
    }
    throw getErr;
  }
};

const setSyntheticsAPIKey = async (
  soClient: SavedObjectsClientContract,
  apiKey: SyntheticsServiceApiKey,
  id: string
) => {
  await soClient.create(syntheticsServiceApiKey.name, apiKey, {
    id,
    overwrite: true,
  });
};

const deleteSyntheticsAPIKey = async (soClient: SavedObjectsClientContract, id: string) => {
  try {
    return await soClient.delete(syntheticsServiceApiKey.name, id);
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return;
    }
    throw e;
  }
};

const createSyntheticsAPIKeySavedObject = (id: string) => ({
  get: (server: SyntheticsServerSetup) => getSyntheticsAPIKey(server, id),
  set: (soClient: SavedObjectsClientContract, apiKey: SyntheticsServiceApiKey) =>
    setSyntheticsAPIKey(soClient, apiKey, id),
  delete: (soClient: SavedObjectsClientContract) => deleteSyntheticsAPIKey(soClient, id),
});

export const syntheticsServiceAPIKeySavedObject =
  createSyntheticsAPIKeySavedObject(syntheticsApiKeyID);

export const privateLocationShardingAPIKeySavedObject = createSyntheticsAPIKeySavedObject(
  privateLocationShardingApiKeyID
);
