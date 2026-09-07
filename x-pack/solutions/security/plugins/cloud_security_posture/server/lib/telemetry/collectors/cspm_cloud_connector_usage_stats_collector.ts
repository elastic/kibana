/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '@kbn/fleet-plugin/common';
import type { CloudSecurityCSPMCloudConnectorUsageStats } from './types';
import type { CspServerPluginStart, CspServerPluginStartDeps } from '../../../types';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../../../common/constants';

/**
 * Checks if the cloud connector has valid credentials based on cloud provider
 */
const hasValidCredentials = (cloudProvider: string, vars: Record<string, any>): boolean => {
  switch (cloudProvider) {
    case 'aws':
      return !!(vars.role_arn?.value && vars.external_id?.value);
    case 'azure':
      return !!(
        vars.client_id?.value &&
        vars.tenant_id?.value &&
        vars.azure_cloud_connector_id?.value
      );
    case 'gcp':
      return !!(vars.credentials?.value || vars.credentials_file?.value);
    default:
      return false;
  }
};

export const getCspmCloudConnectorUsageStats = async (
  soClient: SavedObjectsClientContract,
  coreServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>,
  logger: Logger
): Promise<CloudSecurityCSPMCloudConnectorUsageStats[]> => {
  try {
    const [, cspServerPluginStartDeps] = await coreServices;

    // Get cloud connector service
    const cloudConnectorService = cspServerPluginStartDeps.fleet.cloudConnectorService;
    if (!cloudConnectorService) {
      logger.debug('Cloud connector service not available');
      return [];
    }

    // Get all cloud connectors
    const cloudConnectors = await cloudConnectorService.getList(soClient);
    if (!cloudConnectors.length) {
      logger.debug('No cloud connectors found');
      return [];
    }

    // Get package policies that use cloud connectors
    const packagePolicyService = cspServerPluginStartDeps.fleet.packagePolicyService;
    const packagePolicies = await packagePolicyService.list(soClient, {
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:"${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}" AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.cloud_connector_id:*`,
    });

    const stats: CloudSecurityCSPMCloudConnectorUsageStats[] = cloudConnectors.map((connector) => {
      // Filter package policies for this cloud connector
      const connectorPackagePolicies = packagePolicies.items.filter(
        (policy) => policy.cloud_connector_id === connector.id
      );

      // Extract integration types and packages
      const packagePolicyIds: string[] = [];

      connectorPackagePolicies.forEach((policy) => {
        packagePolicyIds.push(policy.id);
      });

      return {
        id: connector.id,
        created_at: connector.created_at,
        updated_at: connector.updated_at,
        hasCredentials: hasValidCredentials(connector.cloudProvider, connector.vars || {}),
        cloud_provider: connector.cloudProvider,
        account_type: connector.accountType,
        packagePolicyIds,
        packagePolicyCount: connectorPackagePolicies.length,
      };
    });

    logger.info(`Collected CSPM cloud connector usage stats for ${stats.length} connectors`);
    return stats;
  } catch (error) {
    logger.error(`Failed to collect CSPM cloud connector usage stats: ${error.message}`);
    return [];
  }
};
