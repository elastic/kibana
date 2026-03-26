/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '@kbn/fleet-plugin/common';
import { agentPolicyService } from '@kbn/fleet-plugin/server/services';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../../plugin_contract';
import type { AssetInventoryInstallationStats } from '../type';

/**
 * Gets installation statistics for package policies with cloud connector support
 *
 * @param packagePolicies - List of package policies to process
 * @param agentPolicies - List of agent policies for enrichment
 * @returns Array of installation statistics
 */
const getInstalledPackagePolicies = (
  packagePolicies: PackagePolicy[],
  agentPolicies: AgentPolicy[]
): AssetInventoryInstallationStats[] => {
  const installationStats = packagePolicies.flatMap(
    (packagePolicy: PackagePolicy): AssetInventoryInstallationStats[] =>
      packagePolicy.policy_ids.map((agentPolicyId) => {
        const matchedAgentPolicy = agentPolicies?.find(
          (agentPolicy) => agentPolicy?.id === agentPolicyId
        );

        const agentCounts = matchedAgentPolicy?.agents || 0;
        const isAgentless = !!matchedAgentPolicy?.supports_agentless;

        return {
          package_policy_id: packagePolicy.id,
          package_name: packagePolicy.package?.name || '',
          package_version: packagePolicy.package?.version || '',
          created_at: packagePolicy.created_at,
          agent_policy_id: agentPolicyId,
          agent_count: agentCounts,
          is_agentless: isAgentless,
          supports_cloud_connector: !!packagePolicy?.supports_cloud_connector,
          cloud_connector_id: packagePolicy.cloud_connector_id || null,
        };
      })
  );

  return installationStats;
};

/**
 * Collects installation statistics for Asset Inventory package policies
 *
 * This collector gathers information about:
 * - Package policies that support cloud connectors
 * - Agent policy associations
 * - Agent counts and agentless deployments
 * - Cloud connector references
 *
 * @param esClient - Elasticsearch client
 * @param soClient - Saved Objects client
 * @param coreServices - Core services promise
 * @param logger - Logger instance
 * @returns Promise resolving to array of installation statistics
 */
export const getAssetInventoryInstallationStats = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  coreServices: Promise<
    [CoreStart, SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart]
  >,
  logger: Logger
): Promise<AssetInventoryInstallationStats[]> => {
  try {
    const [, securitySolutionPluginStartDeps] = await coreServices;

    const packagePolicyService = securitySolutionPluginStartDeps.fleet?.packagePolicyService;
    if (!packagePolicyService) {
      logger.debug('Package policy service not available for Asset Inventory installation stats');
      return [];
    }

    // Query all package policies that support cloud connectors
    const packagePolicies = await packagePolicyService.list(soClient, {
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.supports_cloud_connector:true`,
    });

    if (!packagePolicies || !packagePolicies.items.length) {
      logger.debug('No package policies with cloud connector support found for Asset Inventory');
      return [];
    }

    // Get all agent policies with agent counts for enrichment
    const agentPolicies = await agentPolicyService.list(soClient, {
      perPage: SO_SEARCH_LIMIT,
      kuery: '',
      esClient,
      withAgentCount: true,
    });

    const installationStats: AssetInventoryInstallationStats[] = getInstalledPackagePolicies(
      packagePolicies.items,
      agentPolicies?.items || []
    );

    logger.info(
      `Collected Asset Inventory installation stats for ${installationStats.length} package policies`
    );

    return installationStats;
  } catch (error) {
    logger.error(`Failed to collect Asset Inventory installation stats: ${error.message}`);
    logger.error(error.stack);
    return [];
  }
};
