/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ServiceAccountWorkloadBinding,
  ServiceAccountWorkloadTypeRegistration,
} from '@kbn/core-security-server';

/**
 * The sandbox reaching Elasticsearch is one workload per space: each space binds its own service
 * account, so the sandbox of an investigation queries as the account of the space it runs in.
 */
export const SANDBOX_ELASTICSEARCH_WORKLOAD_TYPE = 'sandbox_elasticsearch';
export const SANDBOX_ELASTICSEARCH_WORKLOAD_ID = 'default';

export const sandboxElasticsearchWorkloadType: ServiceAccountWorkloadTypeRegistration = {
  type: SANDBOX_ELASTICSEARCH_WORKLOAD_TYPE,
  name: 'Nightshift sandbox Elasticsearch access',
  description:
    'The account the Nightshift sandbox queries Elasticsearch as, assumed by sandbox-api. One per space.',
};

// Service account names are capped at 128 characters (SERVICE_ACCOUNT_NAME_MAX_LENGTH).
const SERVICE_ACCOUNT_NAME_MAX_LENGTH = 128;

// Bindings are re-read at most this often per space on the tool path, so an unbind or rebind
// reaches running investigations within a minute.
const SERVICE_ACCOUNT_ID_CACHE_TTL_MS = 60_000;

/** The service account bound for the sandbox in one space. Holds no credential. */
export interface SandboxElasticsearchAccess {
  serviceAccountId: string;
  spaceId: string;
  /** ISO-8601 timestamp of the bind. */
  boundAt: string;
}

export interface SandboxElasticsearchAccessClient {
  /** Whether UIAM mode is configured (`sandbox.elasticsearch.uiam.enabled`). */
  isEnabled: () => boolean;
  /** The space of the request, which is the space whose binding the other methods address. */
  getSpaceId: (request: KibanaRequest) => string;
  /** The service account bound in the space of the request, or `undefined` when there is none. */
  get: (request: KibanaRequest) => Promise<SandboxElasticsearchAccess | undefined>;
  /** The bound service account id of the request's space; found ids are cached for a minute. */
  getServiceAccountId: (request: KibanaRequest) => Promise<string | undefined>;
  /**
   * Returns the service account bound in the space of the request, creating and binding one first
   * with the caller's credentials when there is none. Needs a real user request with the
   * `manage_security` cluster privilege.
   */
  ensure: (request: KibanaRequest) => Promise<SandboxElasticsearchAccess>;
}

export interface SandboxElasticsearchAccessConfig {
  enabled: boolean;
  /** Prefix of the account name; the space id is appended. */
  serviceAccountName: string;
  roles: string[];
}

export interface SandboxElasticsearchAccessClientDeps {
  security?: CoreStart['security'];
}

export class SandboxElasticsearchAccessDisabledError extends Error {}

export const getSandboxServiceAccountName = (prefix: string, spaceId: string): string =>
  `${prefix}-${spaceId}`.slice(0, SERVICE_ACCOUNT_NAME_MAX_LENGTH);

const toAccess = ({
  serviceAccountId,
  spaceId,
  boundAt,
}: ServiceAccountWorkloadBinding): SandboxElasticsearchAccess => ({
  serviceAccountId,
  spaceId,
  boundAt,
});

export const createSandboxElasticsearchAccessClient = ({
  getDeps,
  getSpaceId,
  config,
  logger,
}: {
  getDeps: () => SandboxElasticsearchAccessClientDeps;
  getSpaceId: (request: KibanaRequest) => string;
  config: SandboxElasticsearchAccessConfig;
  logger: Logger;
}): SandboxElasticsearchAccessClient => {
  const cachedServiceAccountIds = new Map<string, { id: string; expiresAt: number }>();
  const pendingEnsures = new Map<string, Promise<SandboxElasticsearchAccess>>();

  const getServiceAccounts = () => {
    const { security } = getDeps();
    if (!security) {
      throw new Error('security is not available — plugin start() has not been called');
    }
    return security.serviceAccounts;
  };

  const cache = ({ spaceId, serviceAccountId }: SandboxElasticsearchAccess) => {
    cachedServiceAccountIds.set(spaceId, {
      id: serviceAccountId,
      expiresAt: Date.now() + SERVICE_ACCOUNT_ID_CACHE_TTL_MS,
    });
  };

  const getInSpace = async (spaceId: string): Promise<SandboxElasticsearchAccess | undefined> => {
    const binding = await getServiceAccounts().getWorkloadBinding({
      workloadType: SANDBOX_ELASTICSEARCH_WORKLOAD_TYPE,
      workloadId: SANDBOX_ELASTICSEARCH_WORKLOAD_ID,
      spaceId,
    });
    if (!binding) {
      cachedServiceAccountIds.delete(spaceId);
      return undefined;
    }
    const access = toAccess(binding);
    cache(access);
    return access;
  };

  const createAndBind = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<SandboxElasticsearchAccess> => {
    const serviceAccounts = getServiceAccounts();
    if (!serviceAccounts.isEnabled()) {
      throw new SandboxElasticsearchAccessDisabledError(
        'Service accounts are disabled. Set xpack.security.serviceAccounts.enabled: true.'
      );
    }

    const account = await serviceAccounts.create(request, {
      name: getSandboxServiceAccountName(config.serviceAccountName, spaceId),
      description: `Lets the Nightshift sandbox query this project through sandbox-api, for space [${spaceId}].`,
      roles: config.roles,
      platformAssumers: ['sandbox'],
    });
    logger.info(
      `Created sandbox Elasticsearch service account [${account.id}] for space [${spaceId}]`
    );

    // Binds in the space of the request. Another Kibana instance binding concurrently replaces
    // this binding or is replaced by it; either way the account it does not name stays unused.
    const access = toAccess(
      await serviceAccounts.bindWorkload(request, {
        workloadType: SANDBOX_ELASTICSEARCH_WORKLOAD_TYPE,
        workloadId: SANDBOX_ELASTICSEARCH_WORKLOAD_ID,
        serviceAccountId: account.id,
      })
    );
    cache(access);
    return access;
  };

  return {
    isEnabled: () => config.enabled,
    getSpaceId,
    get: (request) => getInSpace(getSpaceId(request)),
    getServiceAccountId: async (request) => {
      const spaceId = getSpaceId(request);
      const cached = cachedServiceAccountIds.get(spaceId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.id;
      }
      return (await getInSpace(spaceId))?.serviceAccountId;
    },
    ensure: async (request) => {
      if (!config.enabled) {
        throw new SandboxElasticsearchAccessDisabledError(
          'UIAM mode is disabled. Set xpack.nightshift_investigations.sandbox.elasticsearch.uiam.enabled: true.'
        );
      }
      const spaceId = getSpaceId(request);
      const bound = await getInSpace(spaceId);
      if (bound) {
        return bound;
      }
      // Concurrent callers in this process share one create per space.
      let pending = pendingEnsures.get(spaceId);
      if (!pending) {
        pending = createAndBind(request, spaceId).finally(() => {
          pendingEnsures.delete(spaceId);
        });
        pendingEnsures.set(spaceId, pending);
      }
      return pending;
    },
  };
};
