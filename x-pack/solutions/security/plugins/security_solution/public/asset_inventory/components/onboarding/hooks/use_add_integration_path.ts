/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';
import { useAssetDiscoveryIntegration } from './use_get_asset_discovery_integration';

/**
 * Hook to get the path for adding an integration when clicking on "Add integration" button.
 * It checks if the Asset Discovery integration path is available, otherwise it defaults to the Integrations page path.
 */
export const useAddIntegrationPath = () => {
  const { application } = useKibana().services;

  const integrationsPath = application.getUrlForApp(INTEGRATIONS_PLUGIN_ID);

  const assetDiscoveryIntegration = useAssetDiscoveryIntegration();

  const addIntegrationPath = assetDiscoveryIntegration?.path
    ? assetDiscoveryIntegration.path
    : integrationsPath;

  return {
    addIntegrationPath,
    isLoading: assetDiscoveryIntegration.isLoading,
    isError: assetDiscoveryIntegration.isError,
    error: assetDiscoveryIntegration.error,
  };
};
