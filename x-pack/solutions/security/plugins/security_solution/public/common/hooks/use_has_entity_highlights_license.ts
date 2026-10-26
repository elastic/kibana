/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLicense } from './use_license';
import { useHasSecurityCapability } from '../../helper_hooks';

/**
 * Hook to determine if the user has the required license for entity highlights (GenAI) feature.
 *
 * In ESS/Self-Managed: Requires Enterprise license or higher
 * In Serverless: Requires Security Analytics Complete tier (not Essentials)
 */
export const useHasEntityHighlightsLicense = (): boolean => {
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const licenseService = useLicense();

  return hasEntityAnalyticsCapability && licenseService.isEnterprise();
};
