/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { CloudSecurityCSPMCloudConnectorUsageStats } from './types';

const CLOUD_CONNECTOR_SAVED_OBJECT_TYPE = 'fleet-cloud-connector';
const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

interface CloudConnectorSOAttributes {
  name: string;
  cloudProvider: string;
  vars: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const hasCredentials = (cloudProvider: string, vars: Record<string, any>): boolean => {
  if (cloudProvider === 'aws') {
    // Check for AWS credentials: role_arn and external_id
    const hasRoleArn = !!vars?.role_arn?.value;
    const hasExternalId = !!vars?.external_id?.value;
    return hasRoleArn && hasExternalId;
  } else if (cloudProvider === 'azure') {
    // Check for Azure credentials: client_id, tenant_id, and azure_connector_id
    const hasClientId = !!vars?.client_id?.value;
    const hasTenantId = !!vars?.tenant_id?.value;
    const hasAzureConnectorId = !!vars?.azure_connector_id?.value;
    return hasClientId && hasTenantId && hasAzureConnectorId;
  }
  return false;
};

export const getCspmCloudConnectorUsageStats = async (
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<CloudSecurityCSPMCloudConnectorUsageStats[]> => {
  try {
    // Fetch all cloud connectors
    const cloudConnectors = await soClient.find<CloudConnectorSOAttributes>({
      type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      perPage: 10000,
    });

    if (!cloudConnectors.saved_objects.length) {
      return [];
    }

    // Fetch all package policies to count usage per connector
    const packagePolicies = await soClient.find({
      type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      perPage: 10000,
      filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:*`,
    });

    // Build a map of cloud connector ID to package policy IDs
    const connectorToPackagePolicies = new Map<string, string[]>();

    packagePolicies.saved_objects.forEach((pp) => {
      const cloudConnectorId = pp.attributes.cloud_connector_id;
      if (cloudConnectorId) {
        if (!connectorToPackagePolicies.has(cloudConnectorId)) {
          connectorToPackagePolicies.set(cloudConnectorId, []);
        }
        connectorToPackagePolicies.get(cloudConnectorId)!.push(pp.id);
      }
    });

    // Map cloud connectors to usage stats
    const stats: CloudSecurityCSPMCloudConnectorUsageStats[] = cloudConnectors.saved_objects.map(
      (connector) => {
        const packagePolicyIds = connectorToPackagePolicies.get(connector.id) || [];

        return {
          id: connector.id,
          created_at: connector.attributes.created_at,
          updated_at: connector.attributes.updated_at,
          hasCredentials: hasCredentials(
            connector.attributes.cloudProvider,
            connector.attributes.vars
          ),
          cloud_provider: connector.attributes.cloudProvider,
          packagePolicyIds,
          packagePolicyCount: packagePolicyIds.length,
        };
      }
    );

    return stats;
  } catch (error) {
    logger.error(`Failed to get CSPM cloud connector usage stats: ${error.message}`);
    logger.error(error.stack);
    return [];
  }
};
