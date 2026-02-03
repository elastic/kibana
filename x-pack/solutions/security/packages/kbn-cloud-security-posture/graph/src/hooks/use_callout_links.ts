/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';

export const CLOUD_ASSET_DISCOVERY_INTEGRATION_ID =
  'cloud_asset_inventory-2773feaf-50bb-43f8-9fa9-8f9a5f85e566';

/**
 * Hook to build Discover URL with cloud asset inventory data view preselected.
 *
 * @param dataViews - DataViews service for looking up data view IDs
 * @param getUrlForApp - Function to generate app URLs
 * @returns Discover URL with data view preselected if found, otherwise undefined if getUrlForApp is unavailable
 */
const useDiscoverUrl = (
  dataViews: DataViewsPublicPluginStart | undefined,
  getUrlForApp: ((appId: string, options?: { path?: string }) => string) | undefined
): string | undefined => {
  const [cloudAssetDataViewId, setCloudAssetDataViewId] = useState<string | undefined>();

  // Look up the cloud asset inventory data view ID
  useEffect(() => {
    if (!dataViews) return;

    dataViews.get(CLOUD_ASSET_DISCOVERY_INTEGRATION_ID).then(
      (dataView) => {
        if (dataView) {
          setCloudAssetDataViewId(dataView.id);
        }
      },
      () => {
        // Silently fail
      }
    );
  }, [dataViews]);

  if (!getUrlForApp) return undefined;

  // Build Discover URL with cloud asset inventory data view if found
  return cloudAssetDataViewId
    ? getUrlForApp('discover', {
        path: `#/?_a=(dataSource:(dataViewId:'${cloudAssetDataViewId}',type:dataView))`,
      })
    : getUrlForApp('discover');
};

/**
 * Hook to generate URLs for callout links using Kibana's routing.
 *
 * @returns Object containing integration, entity store, and discover URLs, or undefined if getUrlForApp is unavailable
 */
export const useCalloutLinks = ():
  | {
      integrationUrl: string;
      entityStoreUrl: string;
      discoverUrl: string;
    }
  | undefined => {
  const { services } = useKibana<{ dataViews?: DataViewsPublicPluginStart }>();
  const { application, dataViews } = services;
  const getUrlForApp = application?.getUrlForApp;

  // Call hook unconditionally before any early returns
  const discoverUrl = useDiscoverUrl(dataViews, getUrlForApp);

  if (!getUrlForApp || !discoverUrl) {
    return undefined;
  }

  // Build URLs using Kibana's getUrlForApp
  const integrationUrl = `${getUrlForApp(
    INTEGRATIONS_PLUGIN_ID
  )}/detail/cloud_asset_inventory/overview`;

  // Hard-coded path referencing ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH
  // from x-pack/solutions/security/plugins/security_solution/common/constants.ts
  const entityStoreUrl = getUrlForApp('security', {
    path: '/entity_analytics_entity_store',
  });

  return {
    integrationUrl,
    entityStoreUrl,
    discoverUrl,
  };
};
