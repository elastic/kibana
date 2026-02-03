/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

interface ScoutSpace {
  id: string;
}

interface FleetItemResponse {
  item: unknown;
}

interface FleetItemsResponse {
  items: Array<{ id: string }>;
}

interface FleetSettingsResponse {
  item?: {
    has_seen_add_data_notice?: boolean;
  };
}

export interface CloudConnectorApiService {
  getCloudConnector: (id: string) => Promise<unknown>;
  getAllCloudConnectors: () => Promise<unknown[]>;
  deleteAllCloudConnectors: () => Promise<void>;
  deleteAllPackagePolicies: () => Promise<void>;
  isAgentlessEnabled: () => Promise<boolean>;
}

export const getCloudConnectorApiService = ({
  kbnClient,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  scoutSpace?: ScoutSpace;
}): CloudConnectorApiService => {
  // Build space-aware path prefix
  const basePath = scoutSpace?.id ? `/s/${scoutSpace.id}` : '';

  return {
    getCloudConnector: async (id: string) => {
      const response = await kbnClient.request<FleetItemResponse>({
        method: 'GET',
        path: `${basePath}/api/fleet/cloud_connectors/${id}`,
      });
      return response.data.item;
    },

    getAllCloudConnectors: async () => {
      const response = await kbnClient.request<FleetItemsResponse>({
        method: 'GET',
        path: `${basePath}/api/fleet/cloud_connectors`,
      });
      return response.data.items || [];
    },

    deleteAllCloudConnectors: async () => {
      const response = await kbnClient.request<FleetItemsResponse>({
        method: 'GET',
        path: `${basePath}/api/fleet/cloud_connectors`,
      });

      const connectors = response.data.items || [];
      for (const connector of connectors) {
        try {
          await kbnClient.request({
            method: 'DELETE',
            path: `${basePath}/api/fleet/cloud_connectors/${connector.id}`,
            body: { force: true },
          });
        } catch (error) {
          // Ignore errors during cleanup
          // eslint-disable-next-line no-console
          console.log(`Failed to delete cloud connector ${connector.id}:`, error);
        }
      }
    },

    deleteAllPackagePolicies: async () => {
      const response = await kbnClient.request<FleetItemsResponse>({
        method: 'GET',
        path: `${basePath}/api/fleet/package_policies`,
      });

      const policies = response.data.items || [];
      const policyIds = policies.map((p) => p.id);

      if (policyIds.length > 0) {
        try {
          await kbnClient.request({
            method: 'POST',
            path: `${basePath}/api/fleet/package_policies/delete`,
            body: { packagePolicyIds: policyIds, force: true },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log('Failed to delete package policies:', error);
        }
      }
    },

    /**
     * Check if agentless is enabled in Fleet settings.
     * Agentless requires both cloud mode and agentless.enabled=true in config.
     */
    isAgentlessEnabled: async () => {
      try {
        const response = await kbnClient.request<FleetSettingsResponse>({
          method: 'GET',
          path: `${basePath}/api/fleet/settings`,
        });
        // Check if agentless is supported/enabled in the Fleet settings
        return response.data?.item?.has_seen_add_data_notice === undefined ? false : true;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Failed to check agentless status:', error);
        return false;
      }
    },
  };
};
