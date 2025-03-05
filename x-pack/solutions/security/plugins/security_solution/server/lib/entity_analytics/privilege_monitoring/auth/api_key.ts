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
import type { SavedObjectsType } from '@kbn/core/server';
import { getPrivmonEncryptedSavedObjectId } from './saved_object';
import { privilegeMonitoringRuntimePrivileges } from './privileges';

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
    getClientFromApiKey: getClientFromApiKey(deps),
    getRequestFromApiKey,
  };
};

const generate = async (deps: ApiKeyManagerDependencies) => {
  const { core, encryptedSavedObjects, request, namespace } = deps;
  if (!encryptedSavedObjects) {
    throw new Error(
      'Unable to create API key. Ensure encrypted Saved Object client is enabled in this environment.'
    );
  } else if (!request) {
    throw new Error('Unable to create API key due to invalid request');
  } else {
    const apiKey = await generateAPIKey(request, deps);

    const soClient = core.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [PrivilegeMonitoringApiKeyType.name],
    });

    await soClient.create(PrivilegeMonitoringApiKeyType.name, apiKey, {
      id: getPrivmonEncryptedSavedObjectId(namespace),
      overwrite: true,
      managed: true,
    });
  }
};

const getApiKey = async (deps: ApiKeyManagerDependencies) => {
  if (!deps.encryptedSavedObjects) {
    throw Error(
      'Unable to retrieve API key. Ensure encrypted Saved Object client is enabled in this environment.'
    );
  }
  try {
    const encryptedSavedObjectsClient = deps.encryptedSavedObjects.getClient({
      includedHiddenTypes: [PrivilegeMonitoringApiKeyType.name],
    });
    return (
      await encryptedSavedObjectsClient.getDecryptedAsInternalUser<PrivilegeMonitoringAPIKey>(
        PrivilegeMonitoringApiKeyType.name,
        getPrivmonEncryptedSavedObjectId(deps.namespace)
      )
    ).attributes;
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return undefined;
    }
    throw err;
  }
};

const getRequestFromApiKey = async (apiKey: PrivilegeMonitoringAPIKey) => {
  return getFakeKibanaRequest({
    id: apiKey.id,
    api_key: apiKey.apiKey,
  });
};
const getClientFromApiKey =
  (deps: ApiKeyManagerDependencies) => async (apiKey: PrivilegeMonitoringAPIKey) => {
    const fakeRequest = getFakeKibanaRequest({
      id: apiKey.id,
      api_key: apiKey.apiKey,
    });
    const clusterClient = deps.core.elasticsearch.client.asScoped(fakeRequest);
    const soClient = deps.core.savedObjects.getScopedClient(fakeRequest, {
      includedHiddenTypes: [PrivilegeMonitoringApiKeyType.name],
    });
    return {
      clusterClient,
      soClient,
    };
  };

export const generateAPIKey = async (
  req: KibanaRequest,
  deps: ApiKeyManagerDependencies
): Promise<PrivilegeMonitoringAPIKey | undefined> => {
  const apiKey = await deps.security.authc.apiKeys.grantAsInternalUser(req, {
    name: 'Privilege Monitoring API key',
    role_descriptors: {
      privmon_admin: privilegeMonitoringRuntimePrivileges,
    },
    metadata: {
      description: 'API key used to manage the resources in the privilege monitoring engine',
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
