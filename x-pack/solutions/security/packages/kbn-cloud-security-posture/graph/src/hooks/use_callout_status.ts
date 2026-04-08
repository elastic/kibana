/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { epmRouteService, API_VERSIONS as FLEET_API_VERSIONS } from '@kbn/fleet-plugin/common';
import type { GetInfoResponse } from '@kbn/fleet-plugin/common';
import type { NodeViewModel, EntityNodeViewModel } from '../components/types';
import { isEntityNode } from '../components/utils';
import type { CalloutVariant } from '../components/callout/callout.translations';

// Constants
const CLOUD_ASSET_DISCOVERY_INTEGRATION_PACKAGE_NAME = 'cloud_asset_inventory' as const;

// Types

export type UseCalloutStatusResult =
  | { status: 'ok' | 'error' | 'loading'; shouldShowCallout: false }
  | { status: CalloutVariant; shouldShowCallout: true };

// Helper functions
const checkIsIntegrationInstalled = (packageInfo: GetInfoResponse | undefined): boolean => {
  return packageInfo?.item?.status === 'installed';
};

const hasUnavailableEntity = (entityNodes: EntityNodeViewModel[]): boolean => {
  return entityNodes.some((node) => {
    if (!node.documentsData || !Array.isArray(node.documentsData)) {
      return false;
    }
    return node.documentsData.some((doc) => doc.entity?.availableInEntityStore === false);
  });
};

const hasUnenrichedEntity = (entityNodes: EntityNodeViewModel[]): boolean => {
  return entityNodes.some((node) => {
    if (!node.documentsData || !Array.isArray(node.documentsData)) {
      return false;
    }

    return node.documentsData.some(
      (doc) => !doc.entity?.name || !doc.entity?.type || !doc.entity?.sub_type
    );
  });
};

const useCloudAssetInventoryPackageQuery = (
  http: ReturnType<typeof useKibana>['services']['http']
) => {
  return useQuery<GetInfoResponse, IHttpFetchError>({
    queryKey: ['graph', 'callout', 'cloud_asset_inventory_package'],
    queryFn: () => {
      if (!http) {
        throw new Error('HTTP service is not available');
      }
      return http.fetch<GetInfoResponse>(
        epmRouteService.getInfoPath(CLOUD_ASSET_DISCOVERY_INTEGRATION_PACKAGE_NAME),
        {
          version: FLEET_API_VERSIONS.public.v1,
          method: 'GET',
        }
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    enabled: !!http,
  });
};

/**
 * Hook to determine the appropriate callout state for the graph investigation.
 * Detects missing requirements and entity enrichment issues.
 *
 * @param nodes - Array of graph nodes to analyze
 * @returns Object with status and shouldShowCallout flag
 */
export const useCalloutStatus = (nodes: NodeViewModel[]): UseCalloutStatusResult => {
  const { services } = useKibana();
  const http = services?.http;

  // Memoize entity nodes to prevent unnecessary re-renders
  const entityNodesMemo = useMemo(() => nodes.filter(isEntityNode), [nodes]);

  // Check if Cloud Asset Discovery package is installed
  const { data: packageInfoData, error: packageInfoError } =
    useCloudAssetInventoryPackageQuery(http);

  // Memoize the callout variant determination
  const result = useMemo<UseCalloutStatusResult>(() => {
    try {
      // Return error status on any errors - fail gracefully
      if (packageInfoError) {
        return { status: 'error', shouldShowCallout: false };
      }

      // Return loading status while waiting for required data
      if (!packageInfoData) {
        return { status: 'loading', shouldShowCallout: false };
      }

      // Check if integration is installed
      const isIntegrationInstalled = checkIsIntegrationInstalled(packageInfoData);

      // Priority 1: Uninstalled integration
      if (!isIntegrationInstalled) {
        return { status: 'uninstalledIntegration', shouldShowCallout: true };
      }

      // Return early if no entity nodes to check
      if (entityNodesMemo.length === 0) {
        return { status: 'ok', shouldShowCallout: false };
      }

      // Priority 2: Check if any entity is unavailable in Entity Store
      if (hasUnavailableEntity(entityNodesMemo)) {
        return { status: 'unavailableEntityInfo', shouldShowCallout: true };
      }

      // Priority 3: Check for unenriched entities (missing type or sub_type);
      if (hasUnenrichedEntity(entityNodesMemo)) {
        return { status: 'unknownEntityType', shouldShowCallout: true };
      }

      // All checks passed - no callout needed
      return { status: 'ok', shouldShowCallout: false };
    } catch (error) {
      // Fail gracefully on any unexpected errors
      return { status: 'error', shouldShowCallout: false };
    }
  }, [entityNodesMemo, packageInfoData, packageInfoError]);

  return result;
};
