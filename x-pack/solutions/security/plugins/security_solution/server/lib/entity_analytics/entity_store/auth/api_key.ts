/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { generateEntityDiscoveryAPIKey } from '@kbn/entityManager-plugin/server/lib/auth';
import { EntityDiscoveryApiKeyType } from '@kbn/entityManager-plugin/server/saved_objects';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import type { EntityDiscoveryAPIKey } from '@kbn/entityManager-plugin/server/lib/auth/api_key/api_key';
import { getSpaceAwareEntityDiscoverySavedObjectId } from '@kbn/entityManager-plugin/server/lib/auth/api_key/saved_object';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

export interface ApiKeyManager {
  generate: () => Promise<void>;
}

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
  encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
  request?: KibanaRequest;
  namespace: string;
}) => ({
  generate: async () => {
    if (!encryptedSavedObjects) {
      throw new Error(
        'Unable to create API key. Ensure encrypted Saved Object client is enabled in this environment.'
      );
    } else if (!request) {
      throw new Error('Unable to create API key due to invalid request');
    } else {
      const apiKey = await generateEntityDiscoveryAPIKey(
        {
          core,
          config: {},
          logger,
          security,
          encryptedSavedObjects,
        },
        request
      );

      const soClient = core.savedObjects.getScopedClient(request, {
        includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
      });

      await soClient.create(EntityDiscoveryApiKeyType.name, apiKey, {
        id: getSpaceAwareEntityDiscoverySavedObjectId(namespace),
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
        includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
      });
      return (
        await encryptedSavedObjectsClient.getDecryptedAsInternalUser<EntityDiscoveryAPIKey>(
          EntityDiscoveryApiKeyType.name,
          getSpaceAwareEntityDiscoverySavedObjectId(namespace)
        )
      ).attributes;
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    }
  },
  getRequestFromApiKey: async (apiKey: EntityDiscoveryAPIKey) => {
    return getFakeKibanaRequest({
      id: apiKey.id,
      api_key: apiKey.apiKey,
    });
  },
  getClientFromApiKey: async (apiKey: EntityDiscoveryAPIKey) => {
    const fakeRequest = getFakeKibanaRequest({
      id: apiKey.id,
      api_key: apiKey.apiKey,
    });
    const clusterClient = core.elasticsearch.client.asScoped(fakeRequest);
    const soClient = core.savedObjects.getScopedClient(fakeRequest, {
      includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
    });
    return {
      clusterClient,
      soClient,
    };
  },
});
