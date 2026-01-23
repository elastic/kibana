/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';

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
  const { services } = useKibana();
  const { application } = services;

  const getUrlForApp = application?.getUrlForApp;

  if (!getUrlForApp) {
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

  const discoverUrl = getUrlForApp('discover');

  return {
    integrationUrl,
    entityStoreUrl,
    discoverUrl,
  };
};
