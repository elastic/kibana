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
import { SavedObjectsErrorHelpers, SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { SO_ENTITY_STORE_API_KEY_TYPE } from './saved_object';
import type { EntityType } from '../../domain/definitions/entity_schema';

export interface EntityStoreAPIKey {
  id: string;
  name: string;
  apiKey: string;
}

const ENTITY_STORE_API_KEY_SO_ID = 'entity-store-api-key';

/**
 * Generates a namespace-aware saved object ID for the API key.
 * With enforceRandomId: false in the encrypted saved object registration,
 * we can use simple string IDs instead of UUIDs.
 */
export const getSpaceAwareEntityStoreSavedObjectId = (namespace: string): string => {
  return `${ENTITY_STORE_API_KEY_SO_ID}-${namespace}`;
};

export interface ApiKeyManager {
  generate: (type: EntityType) => Promise<void>;
  getApiKey: () => Promise<EntityStoreAPIKey | undefined>;
  getRequestFromApiKey: (apiKey: EntityStoreAPIKey) => Promise<KibanaRequest>;
  getClientFromApiKey: (apiKey: EntityStoreAPIKey) => Promise<{
    clusterClient: ReturnType<CoreStart['elasticsearch']['client']['asScoped']>;
    soClient: ReturnType<CoreStart['savedObjects']['getScopedClient']>;
  }>;
}

const generateEntityStoreAPIKey = async ({
  logger,
  security,
  request,
  type,
  namespace,
}: {
  logger: Logger;
  security: SecurityPluginStart;
  request: KibanaRequest;
  type?: EntityType;
  namespace: string;
}): Promise<EntityStoreAPIKey | undefined> => {
  logger.info('Generating Entity Store API key');

  const apiKey = await security.authc.apiKeys.grantAsInternalUser(request, {
    name: `Entity Store API key ${type ? `${type}-` : ''}${namespace}`,
    role_descriptors: {},
    metadata: {
      description: 'API key used to manage the resources in the entity store framework',
      managed: true,
    },
  });

  if (apiKey !== null) {
    return {
      id: apiKey.id,
      name: apiKey.name,
      apiKey: apiKey.api_key,
    };
  }
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
  security?: SecurityPluginStart;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
  request?: KibanaRequest;
  namespace: string;
}): ApiKeyManager => ({
  generate: async (type: EntityType) => {
    if (!encryptedSavedObjects) {
      throw new Error(
        'Unable to create API key. Ensure encrypted Saved Object client is enabled in this environment.'
      );
    } else if (!request) {
      throw new Error('Unable to create API key due to invalid request');
    } else if (!security) {
      throw new Error('Unable to create API key. Security plugin is not available.');
    } else {
      const apiKey = await generateEntityStoreAPIKey({
        logger,
        security,
        request,
        type,
        namespace,
      });

      if (!apiKey) {
        throw new Error('Failed to generate API key');
      }

      const soClient = core.savedObjects.getScopedClient(request, {
        excludedExtensions: [SECURITY_EXTENSION_ID],
        includedHiddenTypes: [SO_ENTITY_STORE_API_KEY_TYPE],
      });

      const savedObjectId = getSpaceAwareEntityStoreSavedObjectId(namespace);

      await soClient.create(SO_ENTITY_STORE_API_KEY_TYPE, apiKey, {
        id: savedObjectId,
        overwrite: true,
        managed: true,
      });
    }
  },
  getApiKey: async () => {
    if (!encryptedSavedObjects) {
      throw Error(
        'Unable to retrieve API key. Ensure encrypted Saved Object client is enabled in this environment.'
      );
    }
    try {
      const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
        includedHiddenTypes: [SO_ENTITY_STORE_API_KEY_TYPE],
      });
      const savedObjectId = getSpaceAwareEntityStoreSavedObjectId(namespace);
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
  getRequestFromApiKey: async (apiKey: EntityStoreAPIKey) => {
    return getFakeKibanaRequest({
      id: apiKey.id,
      api_key: apiKey.apiKey,
    });
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
