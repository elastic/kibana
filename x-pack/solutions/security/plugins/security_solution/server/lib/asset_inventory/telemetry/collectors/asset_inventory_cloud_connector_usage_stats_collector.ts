/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '@kbn/fleet-plugin/common';
import type {
  CloudConnectorVars,
  CloudConnector,
  AwsCloudConnectorVars,
  AzureCloudConnectorVars,
} from '@kbn/fleet-plugin/common/types/models/cloud_connector';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../../plugin_contract';
import type { AssetInventoryCloudConnectorUsageStats } from '../type';

/**
 * Type guard to check if vars is AwsCloudConnectorVars
 */
const isAwsVars = (vars: CloudConnectorVars): vars is AwsCloudConnectorVars => {
  return (
    typeof vars === 'object' &&
    vars !== null &&
    vars !== undefined &&
    'role_arn' in vars &&
    'external_id' in vars
  );
};

/**
 * Type guard to check if vars is AzureCloudConnectorVars
 */
const isAzureVars = (vars: CloudConnectorVars): vars is AzureCloudConnectorVars => {
  return (
    typeof vars === 'object' &&
    vars !== null &&
    vars !== undefined &&
    'tenant_id' in vars &&
    'client_id' in vars &&
    'azure_credentials_cloud_connector_id' in vars
  );
};

/**
 * Checks if the cloud connector has valid credentials based on cloud provider
 */
const hasValidCredentials = (cloudProvider: string, vars: CloudConnectorVars): boolean => {
  switch (cloudProvider) {
    case 'aws':
      if (isAwsVars(vars)) {
        return !!(vars.role_arn?.value && vars.external_id?.value);
      }
      return false;
    case 'azure':
      if (isAzureVars(vars)) {
        return !!(
          vars.client_id?.value &&
          vars.tenant_id?.value &&
          vars.azure_credentials_cloud_connector_id?.value
        );
      }
      return false;
    default:
      return false;
  }
};

export const getAssetInventoryCloudConnectorUsageStats = async (
  soClient: SavedObjectsClientContract,
  coreServices: Promise<
    [CoreStart, SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart]
  >,
  logger: Logger
): Promise<AssetInventoryCloudConnectorUsageStats[]> => {
  try {
    const [, securitySolutionPluginStartDeps] = await coreServices;

    // Get cloud connector service
    const cloudConnectorService = securitySolutionPluginStartDeps.fleet?.cloudConnectorService;
    if (!cloudConnectorService) {
      logger.debug('Cloud connector service not available for Asset Inventory');
      return [];
    }

    // Get all cloud connectors
    const cloudConnectors = await cloudConnectorService.getList(soClient);
    if (!cloudConnectors.length) {
      logger.debug('No cloud connectors found for Asset Inventory');
      return [];
    }

    // Get package policies that use cloud connectors
    const packagePolicyService = securitySolutionPluginStartDeps.fleet?.packagePolicyService;
    if (!packagePolicyService) {
      logger.debug('Package policy service not available for Asset Inventory');
      return [];
    }

    const packagePolicies = await packagePolicyService.list(soClient, {
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.cloud_connector_id:*`,
    });

    const stats: AssetInventoryCloudConnectorUsageStats[] = cloudConnectors.map(
      (connector: CloudConnector) => {
        // Filter package policies for this cloud connector
        const connectorPackagePolicies = packagePolicies.items.filter(
          (policy) => policy.cloud_connector_id === connector.id
        );

        // Extract package policy IDs
        const packagePolicyIds: string[] = connectorPackagePolicies.map((policy) => policy.id);

        return {
          id: connector.id,
          created_at: connector.created_at,
          updated_at: connector.updated_at,
          hasCredentials: hasValidCredentials(connector.cloudProvider, connector.vars),
          cloud_provider: connector.cloudProvider,
          account_type: connector.accountType,
          packagePolicyIds,
          packagePolicyCount: connectorPackagePolicies.length,
        };
      }
    );

    logger.info(
      `Collected Asset Inventory cloud connector usage stats for ${stats.length} connectors`
    );
    return stats;
  } catch (error) {
    logger.error(`Failed to collect Asset Inventory cloud connector usage stats: ${error.message}`);
    return [];
  }
};
