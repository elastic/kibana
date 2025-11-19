/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { useKibana } from '../lib/kibana';
import { useLicense } from './use_license';

/**
 * Hook to determine if the user has the required license for graph visualization feature.
 *
 * In ESS/Self-Managed: Requires Enterprise license or higher
 * In Serverless: Requires Security Analytics Complete tier (not Essentials)
 *
 * @returns boolean indicating if graph visualization is available
 */
export const useHasGraphVisualizationAccess = (): boolean => {
  const { productFeatureKeys$, serverless } = useKibana().services;
  const licenseService = useLicense();

  // Get current product feature keys from observable (serverless PLI system)
  const productFeatureKeys = useObservable(productFeatureKeys$, null);

  // Detect if running in serverless mode
  const isServerless = serverless !== undefined;

  if (isServerless) {
    // In serverless: Check if Complete tier feature is enabled
    return productFeatureKeys?.has(ProductFeatureSecurityKey.graphVisualization) ?? false;
  } else {
    // In ESS/Self-Managed: Check for Enterprise license or higher
    return licenseService.isEnterprise();
  }
};
