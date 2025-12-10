/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { useLicense } from './use_license';
import { useProductFeatureKeys } from './use_product_feature_keys';

/**
 * Hook to determine if the user has the required license for entity highlights (GenAI) feature.
 *
 * In ESS/Self-Managed: Requires Enterprise license or higher
 * In Serverless: Requires Security Analytics Complete tier (not Essentials)
 */
export const useHasEntityHighlightsLicense = (): boolean => {
  const productFeatureKeys = useProductFeatureKeys();
  const licenseService = useLicense();

  return (
    productFeatureKeys.has(ProductFeatureSecurityKey.advancedInsights) &&
    licenseService.isEnterprise()
  );
};
