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

import { PrivilegeMonitoringApiKeyType, getPrivmonEncryptedSavedObjectId } from './saved_object';
import { monitoringEntitySourceType } from '../saved_objects';

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
    generate: () => generate(deps),
    getClient: () => getClient(deps),
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
      includedHiddenTypes: [PrivilegeMonitoringApiKeyType.name, monitoringEntitySourceType.name],
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
const getClient = async (deps: ApiKeyManagerDependencies) => {
  const apiKey = await getApiKey(deps);
  if (!apiKey) return undefined;
  const fakeRequest = getFakeKibanaRequest({
    id: apiKey.id,
    api_key: apiKey.apiKey,
  });
  const clusterClient = deps.core.elasticsearch.client.asScoped(fakeRequest);
  return {
    clusterClient,
  };
};

const generateAPIKey = async (
  req: KibanaRequest,
  deps: ApiKeyManagerDependencies
): Promise<PrivilegeMonitoringAPIKey | undefined> => {
  deps.logger.info('Generating Privmon API key');
  const apiKey = await deps.security.authc.apiKeys.grantAsInternalUser(req, {
    name: 'Privilege Monitoring API key',
    /**
     * Intentionally passing empty array - generates a snapshot (empty object).
     * Due to not knowing what index pattern changes customer may make to index list.
     *
     * - If the customer later adds new indices they *do* have access to, the key will still function.
     * - If they add indices they *don't* have access to, they will need to reinitialize once their access is elevated.
     */
    role_descriptors: {},
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

export interface PrivilegeMonitoringAPIKey {
  id: string;
  name: string;
  apiKey: string;
}
