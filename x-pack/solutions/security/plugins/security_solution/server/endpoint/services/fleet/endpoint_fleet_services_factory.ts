/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentClient,
  AgentPolicyServiceInterface,
  FleetStartContract,
  PackagePolicyClient,
  PackageClient,
} from '@kbn/fleet-plugin/server';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, type PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  AgentPolicyNotFoundError,
  PackagePolicyNotFoundError,
} from '@kbn/fleet-plugin/server/errors';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { EndpointError } from '../../../../common/endpoint/errors';
import { catchAndWrapError } from '../../utils';
import { stringify } from '../../utils/stringify';
import { NotFoundError } from '../../errors';
import type { SavedObjectsClientFactory } from '../saved_objects';

/**
 * The set of Fleet services used by Endpoint
 */
export interface EndpointFleetServicesInterface {
  /** The space id used to initialize the current `EndpointFleetServicesInterface` instance */
  spaceId: string;
  agent: AgentClient;
  agentPolicy: AgentPolicyServiceInterface;
  packages: PackageClient;
  packagePolicy: PackagePolicyClient;
  /** The `kuery` that can be used to filter for Endpoint integration policies */
  endpointPolicyKuery: string;
  logger: Logger;

  /**
   * Will check the data provided to ensure it is visible for the current space. Supports
   * several types of data (ex. integration policies, agent policies, etc)
   */
  ensureInCurrentSpace(
    checks: Pick<
      CheckInCurrentSpaceOptions,
      'agentIds' | 'integrationPolicyIds' | 'agentPolicyIds' | 'options'
    >
  ): Promise<void>;

  /**
   * Returns the SO client that is scoped to the current `EndpointFleetServicesInterface` instance.
   */
  getSoClient(): SavedObjectsClientContract;

  /**
   * Retrieves the `namespace` assigned to Integration Policies
   * @param options
   */
  getPolicyNamespace(
    options: Pick<FetchIntegrationPolicyNamespaceOptions, 'integrationPolicies'>
  ): Promise<FetchIntegrationPolicyNamespaceResponse>;

  /**
   * Retrieves a list of all `namespace`'s in use by a given integration
   * @param integrationNames
   */
  getIntegrationNamespaces(integrationNames: string[]): Promise<Record<string, string[]>>;
}

export interface EndpointInternalFleetServicesInterface extends EndpointFleetServicesInterface {
  savedObjects: SavedObjectsClientFactory;
}

export interface EndpointFleetServicesFactoryInterface {
  asInternalUser(
    /** The specific space ID for the soClient. Can NOT be used if `unscoped` argument is `true` */
    spaceId?: string,
    /**
     * If the soClient created by this service should be unscoped (has access to all spaces).
     * Note that when making SO updates, an `soClient` scoped to the same space as the SO itself is required.
     */
    unscoped?: boolean
  ): EndpointInternalFleetServicesInterface;
}

/**
 * Provides centralized way to get all services for Fleet and access internal saved object clients
 */
export class EndpointFleetServicesFactory implements EndpointFleetServicesFactoryInterface {
  constructor(
    private readonly fleetDependencies: FleetStartContract,
    private readonly savedObjects: SavedObjectsClientFactory,
    private readonly logger: Logger
  ) {}

  asInternalUser(
    spaceId?: string,
    unscoped: boolean = false
  ): EndpointInternalFleetServicesInterface {
    this.logger.debug(
      `creating set of fleet services with spaceId [${spaceId}] and unscoped [${unscoped}]`
    );

    if (spaceId && unscoped) {
      throw new EndpointError(
        `asInternalUser(): a 'spaceId' can not be set when 'unscoped' is 'true'`
      );
    }

    const {
      agentPolicyService: agentPolicy,
      packagePolicyService: packagePolicy,
      agentService,
      packageService,
    } = this.fleetDependencies;
    const agent = spaceId
      ? agentService.asInternalScopedUser(spaceId)
      : agentService.asInternalUser;

    // Lazily Initialized at the time it is needed
    let _soClient: SavedObjectsClientContract;
    const getSoClient = (): SavedObjectsClientContract => {
      if (!_soClient) {
        if (unscoped) {
          this.logger.debug(`getSoClient(): initializing UNSCOPED SO client`);
          _soClient = this.savedObjects.createInternalUnscopedSoClient(false);
        } else {
          this.logger.debug(`getSoClient(): initializing SO client for space [${spaceId}]`);
          _soClient = this.savedObjects.createInternalScopedSoClient({ spaceId, readonly: false });
        }
      }

      return _soClient;
    };

    const ensureInCurrentSpace: EndpointFleetServicesInterface['ensureInCurrentSpace'] = async ({
      integrationPolicyIds = [],
      agentPolicyIds = [],
      agentIds = [],
      options,
    }): Promise<void> => {
      this.logger.debug(`EnsureInCurrentSpace(): Checking access for space [${spaceId}]`);

      return checkInCurrentSpace({
        soClient: getSoClient(),
        agentService: agent,
        agentPolicyService: agentPolicy,
        packagePolicyService: packagePolicy,
        options,
        integrationPolicyIds,
        agentPolicyIds,
        agentIds,
      });
    };

    const getPolicyNamespace: EndpointFleetServicesInterface['getPolicyNamespace'] = async (
      options
    ) => {
      return fetchIntegrationPolicyNamespace({
        ...options,
        soClient: getSoClient(),
        logger: this.logger,
        packagePolicyService: packagePolicy,
        agentPolicyService: agentPolicy,
        // When using an unscoped soClient, make sure the search for policies is done across all spaces.
        spaceId: unscoped ? '*' : undefined,
      });
    };

    const getIntegrationNamespaces: EndpointFleetServicesInterface['getIntegrationNamespaces'] =
      async (integrationNames) => {
        return fetchIntegrationNamespaces({
          soClient: getSoClient(),
          logger: this.logger,
          packagePolicyService: packagePolicy,
          agentPolicyService: agentPolicy,
          integrationNames,
        });
      };

    return {
      spaceId: spaceId || DEFAULT_SPACE_ID,
      logger: this.logger,

      agent,
      agentPolicy,

      packages: packageService.asInternalUser,
      packagePolicy,

      savedObjects: this.savedObjects,

      endpointPolicyKuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "endpoint"`,
      ensureInCurrentSpace,
      getPolicyNamespace,
      getIntegrationNamespaces,
      getSoClient,
    };
  }
}

interface CheckInCurrentSpaceOptions {
  soClient: SavedObjectsClientContract;
  agentService: AgentClient;
  agentPolicyService: AgentPolicyServiceInterface;
  packagePolicyService: PackagePolicyClient;
  options?: {
    /**
     * Ensures that all IDs passed on input MUST be accessible in active space. When set to `false`,
     * at least 1 of the IDs passed on input must be accessible.
     * Defaults to `true` (all must be accessible)
     */
    matchAll?: boolean;
  };
  agentIds?: string[];
  agentPolicyIds?: string[];
  integrationPolicyIds?: string[];
}

/**
 * Checks if data provided (integration policies, agent policies and/or agentIds) are visible in
 * current space
 *
 * @param soClient
 * @param agentService
 * @param agentPolicyService
 * @param packagePolicyService
 * @param integrationPolicyIds
 * @param agentPolicyIds
 * @param agentIds
 * @param options
 *
 * @throws NotFoundError
 */
const checkInCurrentSpace = async ({
  soClient,
  agentService,
  agentPolicyService,
  packagePolicyService,
  integrationPolicyIds = [],
  agentPolicyIds = [],
  agentIds = [],
  options: { matchAll = true } = {},
}: CheckInCurrentSpaceOptions): Promise<void> => {
  const handlePromiseErrors = (err: Error): never => {
    // We wrap the error with our own Error class so that the API can property return a 404
    if (
      err instanceof AgentNotFoundError ||
      err instanceof AgentPolicyNotFoundError ||
      err instanceof PackagePolicyNotFoundError
    ) {
      throw new NotFoundError(err.message, err);
    }

    throw err;
  };

  await Promise.all([
    agentIds.length
      ? agentService
          .getByIds(agentIds, { ignoreMissing: !matchAll })
          .catch(handlePromiseErrors)
          .then((response) => {
            // When `matchAll` is false, the results must have at least matched 1 id
            if (!matchAll && response.length === 0) {
              throw new NotFoundError(`Agent ID(s) not found: [${agentIds.join(', ')}]`);
            }
          })
      : null,

    agentPolicyIds.length
      ? agentPolicyService
          .getByIds(soClient, agentPolicyIds, { ignoreMissing: !matchAll })
          .catch(handlePromiseErrors)
          .then((response) => {
            if (!matchAll && response.length === 0) {
              throw new NotFoundError(
                `Agent policy ID(s) not found: [${agentPolicyIds.join(', ')}]`
              );
            }
          })
      : null,

    integrationPolicyIds.length
      ? packagePolicyService
          .getByIDs(soClient, integrationPolicyIds, { ignoreMissing: !matchAll })
          .catch(handlePromiseErrors)
          .then((response) => {
            if (!matchAll && response.length === 0) {
              throw new NotFoundError(
                `Integration policy ID(s) not found: [${integrationPolicyIds.join(', ')}]`
              );
            }
          })
      : null,
  ]);
};

interface FetchIntegrationPolicyNamespaceOptions {
  logger: Logger;
  soClient: SavedObjectsClientContract;
  packagePolicyService: PackagePolicyClient;
  agentPolicyService: AgentPolicyServiceInterface;
  /** A list of integration policies IDs */
  integrationPolicies: string[];
  /** A list of Integration names */
  integrationNames?: string[];
  /**
   * A list of space IDs to use when retrieving the list of policies. When using an unscoped
   * `soClient` and wanting to retrieve the policies for any space, this options can be used
   * by setting it to `*`
   */
  spaceId?: string;
}

export interface FetchIntegrationPolicyNamespaceResponse {
  /**
   * A map with the policy ids provided to `integrationPolicies` param along with a list of
   * namespaces for that policy
   */
  integrationPolicy: Record<string, string[]>;
}

const fetchIntegrationPolicyNamespace = async ({
  logger,
  soClient,
  packagePolicyService,
  agentPolicyService,
  integrationPolicies,
  spaceId,
}: FetchIntegrationPolicyNamespaceOptions): Promise<FetchIntegrationPolicyNamespaceResponse> => {
  const response: FetchIntegrationPolicyNamespaceResponse = {
    integrationPolicy: {},
  };
  const agentPolicyIdsToRetrieve = new Set<string>();
  const retrievedIntegrationPolicies: Record<string, PackagePolicy> = {};
  const retrievedAgentPolicies: Record<string, AgentPolicy> = {};

  if (integrationPolicies.length > 0) {
    logger.debug(
      () => `Retrieving package policies from fleet for:\n${stringify(integrationPolicies)}`
    );
    const packagePolicies =
      (await packagePolicyService
        .getByIDs(soClient, integrationPolicies, { spaceIds: spaceId ? [spaceId] : undefined })
        .catch(catchAndWrapError)) ?? [];

    logger.trace(() => `Fleet package policies retrieved:\n${stringify(packagePolicies)}`);

    for (const packagePolicy of packagePolicies) {
      retrievedIntegrationPolicies[packagePolicy.id] = packagePolicy;

      // Integration policy does not have an explicit namespace, which means it
      // inherits it from the associated agent policies, so lets retrieve those
      if (!packagePolicy.namespace) {
        packagePolicy.policy_ids.forEach((agentPolicyId) => {
          agentPolicyIdsToRetrieve.add(agentPolicyId);
        });
      }
    }
  }

  if (agentPolicyIdsToRetrieve.size > 0) {
    const ids = Array.from(agentPolicyIdsToRetrieve);

    logger.debug(() => `Retrieving agent policies from fleet for:\n${stringify(ids)}`);

    const agentPolicies = await agentPolicyService
      .getByIds(soClient, ids, {
        spaceId,
      })
      .catch(catchAndWrapError);

    logger.trace(() => `Fleet agent policies retrieved:\n${stringify(agentPolicies)}`);

    for (const agentPolicy of agentPolicies) {
      retrievedAgentPolicies[agentPolicy.id] = agentPolicy;
    }
  }

  for (const integrationPolicyId of integrationPolicies) {
    const integrationPolicyNamespace = retrievedIntegrationPolicies[integrationPolicyId].namespace;

    response.integrationPolicy[integrationPolicyId] = integrationPolicyNamespace
      ? [integrationPolicyNamespace]
      : retrievedIntegrationPolicies[integrationPolicyId].policy_ids.map((agentPolicyId) => {
          return retrievedAgentPolicies[agentPolicyId].namespace;
        });
  }

  logger.debug(() => `Policy namespaces:\n${stringify(response)}`);

  return response;
};

interface FetchIntegrationNamespacesOptions {
  logger: Logger;
  soClient: SavedObjectsClientContract;
  packagePolicyService: PackagePolicyClient;
  agentPolicyService: AgentPolicyServiceInterface;
  /** A list of Integration names */
  integrationNames: string[];
}

const fetchIntegrationNamespaces = async ({
  logger,
  soClient,
  packagePolicyService,
  agentPolicyService,
  integrationNames = [],
}: FetchIntegrationNamespacesOptions): Promise<Record<string, string[]>> => {
  const integrationToNamespaceMap = integrationNames.reduce((acc, name) => {
    acc[name] = new Set<string>();
    return acc;
  }, {} as Record<string, Set<string>>);
  const agentPolicyIdsToRetrieve: Record<string, Set<Set<string>>> = {};

  if (integrationNames.length > 0) {
    const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: (${integrationNames.join(
      ' OR '
    )})`;

    logger.debug(() => `Fetch of policies for integrations using Kuery [${kuery}]`);

    const policiesFound = await packagePolicyService
      .list(soClient, { perPage: 10_000, kuery })
      .catch(catchAndWrapError);

    logger.trace(
      () =>
        `Fetch of policies for integrations using Kuery [${kuery}] returned:\n${stringify(
          policiesFound
        )}`
    );

    for (const packagePolicy of policiesFound.items) {
      if (packagePolicy.package?.name) {
        const integrationName = packagePolicy.package.name;

        if (packagePolicy.namespace) {
          integrationToNamespaceMap[integrationName].add(packagePolicy.namespace);
        } else {
          // Integration policy does not have an explicit namespace, which means it
          // inherits it from the associated agent policies. We'll retrieve these next
          packagePolicy.policy_ids.forEach((agentPolicyId) => {
            if (!agentPolicyIdsToRetrieve[agentPolicyId]) {
              agentPolicyIdsToRetrieve[agentPolicyId] = new Set();
            }

            agentPolicyIdsToRetrieve[agentPolicyId].add(integrationToNamespaceMap[integrationName]);
          });
        }
      }
    }
  }

  const agentPolicyIds = Object.keys(agentPolicyIdsToRetrieve);

  if (agentPolicyIds.length > 0) {
    logger.debug(() => `Retrieving agent policies from fleet for:\n${stringify(agentPolicyIds)}`);

    const agentPolicies = await agentPolicyService
      .getByIds(soClient, agentPolicyIds)
      .catch(catchAndWrapError);

    logger.trace(() => `Fleet agent policies retrieved:\n${stringify(agentPolicies)}`);

    for (const agentPolicy of agentPolicies) {
      for (const nameSpaceSet of agentPolicyIdsToRetrieve[agentPolicy.id]) {
        nameSpaceSet.add(agentPolicy.namespace);
      }
    }
  }

  const response = Object.entries(integrationToNamespaceMap).reduce(
    (acc, [integrationName, namespaceSet]) => {
      acc[integrationName] = Array.from(namespaceSet.values());
      return acc;
    },
    {} as Record<string, string[]>
  );

  logger.debug(() => `Integration namespaces in use:\n${stringify(response)}`);

  return response;
};
