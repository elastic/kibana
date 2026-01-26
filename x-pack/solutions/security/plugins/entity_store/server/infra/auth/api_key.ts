/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { SO_ENTITY_STORE_API_KEY_TYPE } from './saved_object';

/**
 * Entity Store API key saved object.
 */
export interface EntityStoreAPIKey {
  id: string;
  name: string;
  apiKey: string;
}

const ENTITY_STORE_API_KEY_SO_ID = 'entity-store-api-key';

export interface ApiKeyManager {
  /**
   * Generates a new API key and stores in a encrypted saved object.
   */
  generate: () => Promise<void>;

  /**
   * Retrieves the API key from the encrypted saved object.
   */
  getApiKey: () => Promise<EntityStoreAPIKey | undefined>;

  /**
   * Returns ClusterClient (for ElasticsearchClient) and SavedObjectsClient
   * with permissions granted to the API key.
   */
  getClientFromApiKey: (apiKey: EntityStoreAPIKey) => Promise<{
    clusterClient: ReturnType<CoreStart['elasticsearch']['client']['asScoped']>;
    soClient: ReturnType<CoreStart['savedObjects']['getScopedClient']>;
  }>;
}

/**
 * The entity store API Key is used for
 * Querying indices and saved objects in
 * kibana tasks, not scoped for a specific
 * request.
 */
const generateEntityStoreAPIKey = async ({
  logger,
  security,
  request,
}: {
  logger: Logger;
  security: SecurityPluginStart;
  request: KibanaRequest;
}): Promise<EntityStoreAPIKey> => {
  logger.info('Generating Entity Store API key');

  const apiKey = await security.authc.apiKeys.grantAsInternalUser(request, {
    name: `Entity Store API key`,
    role_descriptors: {},
    metadata: {
      description: 'API key used to manage the resources in the entity store framework',
      managed: true,
    },
  });

  if (apiKey === null) {
    throw new Error('Failed to generate Entity Store API key');
  }

  return {
    id: apiKey.id,
    name: apiKey.name,
    apiKey: apiKey.api_key,
  };
};

export const getApiKeyManager = ({
  core,
  logger,
  security,
  encryptedSavedObjects,
  request,
  namespace,
}: {
  core: CoreStart;
  logger: Logger;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  request?: KibanaRequest;
  namespace: string;
}): ApiKeyManager => ({
  generate: async () => {
    if (!request) {
      throw new Error('Unable to create API key due to invalid request');
    }

    const apiKey = await generateEntityStoreAPIKey({
      logger,
      security,
      request,
    });

    const soClient = core.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [SO_ENTITY_STORE_API_KEY_TYPE],
    });

    await soClient.create(SO_ENTITY_STORE_API_KEY_TYPE, apiKey, {
      id: ENTITY_STORE_API_KEY_SO_ID,
      overwrite: true,
      managed: true,
    });
  },
  getApiKey: async () => {
    try {
      const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
        includedHiddenTypes: [SO_ENTITY_STORE_API_KEY_TYPE],
      });
      const savedObjectId = ENTITY_STORE_API_KEY_SO_ID;
      return (
        await encryptedSavedObjectsClient.getDecryptedAsInternalUser<EntityStoreAPIKey>(
          SO_ENTITY_STORE_API_KEY_TYPE,
          savedObjectId,
          { namespace }
        )
      ).attributes;
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    }
  },
  getClientFromApiKey: async (apiKey: EntityStoreAPIKey) => {
    const fakeRequest = getFakeKibanaRequest({
      id: apiKey.id,
      api_key: apiKey.apiKey,
    });
    const clusterClient = core.elasticsearch.client.asScoped(fakeRequest);
    const soClient = core.savedObjects.getScopedClient(fakeRequest, {
      includedHiddenTypes: [SO_ENTITY_STORE_API_KEY_TYPE],
    });
    return {
      clusterClient,
      soClient,
    };
  },
});
