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
import { catchAndWrapError } from '../../utils';
import { stringify } from '../../utils/stringify';
import { NotFoundError } from '../../errors';
import type { SavedObjectsClientFactory } from '../saved_objects';

/**
 * The set of Fleet services used by Endpoint
 */
export interface EndpointFleetServicesInterface {
  agent: AgentClient;
  agentPolicy: AgentPolicyServiceInterface;
  packages: PackageClient;
  packagePolicy: PackagePolicyClient;
  /** The `kuery` that can be used to filter for Endpoint integration policies */
  endpointPolicyKuery: string;

  /**
   * Will check the data provided to ensure it is visible for the current space. Supports
   * several types of data (ex. integration policies, agent policies, etc)
   */
  ensureInCurrentSpace(
    options: Pick<
      CheckInCurrentSpaceOptions,
      'agentIds' | 'integrationPolicyIds' | 'agentPolicyIds'
    >
  ): Promise<void>;

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
  asInternalUser(spaceId?: string): EndpointInternalFleetServicesInterface;
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

  asInternalUser(spaceId?: string): EndpointInternalFleetServicesInterface {
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
    let soClient: SavedObjectsClientContract;

    const ensureInCurrentSpace: EndpointFleetServicesInterface['ensureInCurrentSpace'] = async ({
      integrationPolicyIds = [],
      agentPolicyIds = [],
      agentIds = [],
    }): Promise<void> => {
      if (!soClient) {
        soClient = this.savedObjects.createInternalScopedSoClient({ spaceId });
      }
      return checkInCurrentSpace({
        soClient,
        agentService: agent,
        agentPolicyService: agentPolicy,
        packagePolicyService: packagePolicy,
        integrationPolicyIds,
        agentPolicyIds,
        agentIds,
      });
    };

    const getPolicyNamespace: EndpointFleetServicesInterface['getPolicyNamespace'] = async (
      options
    ) => {
      if (!soClient) {
        soClient = this.savedObjects.createInternalScopedSoClient({ spaceId });
      }

      return fetchIntegrationPolicyNamespace({
        ...options,
        soClient,
        logger: this.logger,
        packagePolicyService: packagePolicy,
        agentPolicyService: agentPolicy,
      });
    };

    const getIntegrationNamespaces: EndpointFleetServicesInterface['getIntegrationNamespaces'] =
      async (integrationNames) => {
        if (!soClient) {
          soClient = this.savedObjects.createInternalScopedSoClient({ spaceId });
        }

        return fetchIntegrationNamespaces({
          soClient,
          logger: this.logger,
          packagePolicyService: packagePolicy,
          agentPolicyService: agentPolicy,
          integrationNames,
        });
      };

    return {
      agent,
      agentPolicy,

      packages: packageService.asInternalUser,
      packagePolicy,

      savedObjects: this.savedObjects,

      endpointPolicyKuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "endpoint"`,
      ensureInCurrentSpace,
      getPolicyNamespace,
      getIntegrationNamespaces,
    };
  }
}

interface CheckInCurrentSpaceOptions {
  soClient: SavedObjectsClientContract;
  agentService: AgentClient;
  agentPolicyService: AgentPolicyServiceInterface;
  packagePolicyService: PackagePolicyClient;
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
    agentIds.length ? agentService.getByIds(agentIds).catch(handlePromiseErrors) : null,

    agentPolicyIds.length
      ? agentPolicyService.getByIds(soClient, agentPolicyIds).catch(handlePromiseErrors)
      : null,

    integrationPolicyIds.length
      ? packagePolicyService.getByIDs(soClient, integrationPolicyIds).catch(handlePromiseErrors)
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
        .getByIDs(soClient, integrationPolicies)
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

    const agentPolicies = await agentPolicyService.getByIds(soClient, ids).catch(catchAndWrapError);

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
