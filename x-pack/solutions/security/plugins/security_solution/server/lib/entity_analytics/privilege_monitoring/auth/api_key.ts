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
import { getSpaceAwareEntityDiscoverySavedObjectId } from '@kbn/entityManager-plugin/server/lib/auth/api_key/saved_object';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { SavedObjectsType } from '@kbn/core/server';
import { EntityManagerServerSetup } from '@kbn/entityManager-plugin/server/types';

export interface ApiKeyManager {
  generate: () => Promise<void>;
}

export interface ApiKeyManagerDependencies {
  core: CoreStart;
  logger: Logger;
  security: SecurityPluginStart;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
  request?: KibanaRequest;
  namespace: string;
}


export const getApiKeyManager = (deps: ApiKeyManagerDependencies) => {

  return {
    generate: generate(deps),
    getApiKey: getApiKey(deps),
    getRequestFromApiKey: getRequestFromApiKey(deps),
    getClientFromApiKey: getClientFromApiKey(deps),
  }
}
  


const generate = async (deps: ApiKeyManagerDependencies) => {
  const { core, logger, security, encryptedSavedObjects, request, namespace } = deps
      if (!encryptedSavedObjects) {
        throw new Error(
          'Unable to create API key. Ensure encrypted Saved Object client is enabled in this environment.'
        );
      } else if (!request) {
        throw new Error('Unable to create API key due to invalid request');
      } else {
        const apiKey = await generateAPIKey(
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
          includedHiddenTypes: [PrivilegeMonitoringApiKeyType.name],
        });

        await soClient.create(PrivilegeMonitoringApiKeyType.name, apiKey, {
          id: getSpaceAwareEntityDiscoverySavedObjectId(namespace),
          overwrite: true,
          managed: true,
        });
      }
}
const getApiKey: async () => {
      if (!encryptedSavedObjects) {
        throw Error(
          'Unable to retrieve API key. Ensure encrypted Saved Object client is enabled in this environment.'
        );
      }
      try {
        const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
          includedHiddenTypes: [PrivilegeMonitoringApiKeyType.name],
        });
        return (
          await encryptedSavedObjectsClient.getDecryptedAsInternalUser<PrivilegeMonitoringAPIKey>(
            PrivilegeMonitoringApiKeyType.name,
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
    getRequestFromApiKey: async (apiKey: PrivilegeMonitoringAPIKey) => {
      return getFakeKibanaRequest({
        id: apiKey.id,
        api_key: apiKey.apiKey,
      });
    },
    getClientFromApiKey: async (apiKey: PrivilegeMonitoringAPIKey) => {
      const fakeRequest = getFakeKibanaRequest({
        id: apiKey.id,
        api_key: apiKey.apiKey,
      });
      const clusterClient = core.elasticsearch.client.asScoped(fakeRequest);
      const soClient = core.savedObjects.getScopedClient(fakeRequest, {
        includedHiddenTypes: [PrivilegeMonitoringApiKeyType.name],
      });
      return {
        clusterClient,
        soClient,
      };
    },
  }

};


export const generateAPIKey = async (
  req: KibanaRequest,
  server: EntityManagerServerSetup,
): Promise<PrivilegeMonitoringAPIKey | undefined> => {
  const apiKey = await server.security.authc.apiKeys.grantAsInternalUser(req, {
    name: 'Entity discovery API key',
    role_descriptors: {
      entity_discovery_admin: entityDefinitionRuntimePrivileges,
    },
    metadata: {
      description:
        'API key used to manage the transforms and ingest pipelines created by the entity discovery framework',
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



export const SO_PRIVILEGE_MONITORING_API_KEY_TYPE = 'entity-discovery-api-key';

export const PrivilegeMonitoringApiKeyType: SavedObjectsType = {
  name: SO_PRIVILEGE_MONITORING_API_KEY_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      apiKey: { type: 'binary' },
    },
  },
  management: {
    importableAndExportable: false,
    displayName: 'Privilege Monitoring API key',
  },
};


export interface PrivilegeMonitoringAPIKey {
  id: string;
  name: string;
  apiKey: string;
}
