/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_ID,
  NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE,
  type NightshiftSandboxEsAccessAttributes,
} from '../saved_objects';

export type SandboxElasticsearchAccess = NightshiftSandboxEsAccessAttributes;

export interface SandboxElasticsearchAccessClient {
  /** Whether UIAM mode is configured (`sandbox.elasticsearch.uiam.enabled`). */
  isEnabled: () => boolean;
  /** The stored service account, or `undefined` when none has been created yet. */
  get: () => Promise<SandboxElasticsearchAccess | undefined>;
  /** The stored service account id; positive results are cached for the process lifetime. */
  getServiceAccountId: () => Promise<string | undefined>;
  /**
   * Returns the stored service account, creating it first with the caller's credentials when there
   * is none. Creating needs a real user request with the `manage_security` cluster privilege.
   */
  ensure: (request: KibanaRequest) => Promise<SandboxElasticsearchAccess>;
}

export interface SandboxElasticsearchAccessConfig {
  enabled: boolean;
  serviceAccountName: string;
  roles: string[];
  assumerServiceAccountId: string;
}

export interface SandboxElasticsearchAccessClientDeps {
  savedObjects?: CoreStart['savedObjects'];
  security?: CoreStart['security'];
}

export class SandboxElasticsearchAccessDisabledError extends Error {}

export const createSandboxElasticsearchAccessClient = ({
  getDeps,
  config,
  logger,
}: {
  getDeps: () => SandboxElasticsearchAccessClientDeps;
  config: SandboxElasticsearchAccessConfig;
  logger: Logger;
}): SandboxElasticsearchAccessClient => {
  let cachedServiceAccountId: string | undefined;
  let pendingEnsure: Promise<SandboxElasticsearchAccess> | undefined;

  const getRepository = () => {
    const { savedObjects } = getDeps();
    if (!savedObjects) {
      throw new Error('savedObjects is not available — plugin start() has not been called');
    }
    return savedObjects.createInternalRepository([NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE]);
  };

  const get = async (): Promise<SandboxElasticsearchAccess | undefined> => {
    try {
      const { attributes } = await getRepository().get<NightshiftSandboxEsAccessAttributes>(
        NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE,
        NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_ID
      );
      cachedServiceAccountId = attributes.serviceAccountId;
      return attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  };

  const create = async (request: KibanaRequest): Promise<SandboxElasticsearchAccess> => {
    const { security } = getDeps();
    if (!security?.serviceAccounts.isEnabled()) {
      throw new SandboxElasticsearchAccessDisabledError(
        'Service accounts are disabled. Set xpack.security.serviceAccounts.enabled: true.'
      );
    }

    const account = await security.serviceAccounts.create(request, {
      name: config.serviceAccountName,
      description: 'Lets the Nightshift sandbox query this project through sandbox-api.',
      roles: config.roles,
      assumableByPlatformServiceAccounts: [config.assumerServiceAccountId],
    });
    logger.info(`Created sandbox Elasticsearch service account [${account.id}]`);

    const attributes: NightshiftSandboxEsAccessAttributes = {
      serviceAccountId: account.id,
      createdAt: new Date().toISOString(),
    };
    try {
      await getRepository().create(NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE, attributes, {
        id: NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_ID,
        overwrite: false,
      });
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
      // Another Kibana instance stored its account first; ours stays unused.
      const stored = await get();
      if (!stored) {
        throw error;
      }
      logger.warn(
        `Sandbox Elasticsearch service account [${account.id}] is unused: [${stored.serviceAccountId}] was stored concurrently`
      );
      return stored;
    }

    cachedServiceAccountId = attributes.serviceAccountId;
    return attributes;
  };

  return {
    isEnabled: () => config.enabled,
    get,
    getServiceAccountId: async () => cachedServiceAccountId ?? (await get())?.serviceAccountId,
    ensure: async (request) => {
      if (!config.enabled) {
        throw new SandboxElasticsearchAccessDisabledError(
          'UIAM mode is disabled. Set xpack.nightshift_investigations.sandbox.elasticsearch.uiam.enabled: true.'
        );
      }
      const stored = await get();
      if (stored) {
        return stored;
      }
      // Concurrent callers in this process share one create.
      pendingEnsure ??= create(request).finally(() => {
        pendingEnsure = undefined;
      });
      return pendingEnsure;
    },
  };
};
