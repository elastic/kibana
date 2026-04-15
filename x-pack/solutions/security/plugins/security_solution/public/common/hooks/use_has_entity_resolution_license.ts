/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLicense } from './use_license';
import { useHasSecurityCapability } from '../../helper_hooks';

/**
 * Whether Entity Resolution UI and APIs are available for the current user.
 *
 * Serverless: requires Complete tier (entity-analytics capability).
 * ESS / self-managed: requires Enterprise license (capability alone is not enough).
 */
export const useHasEntityResolutionLicense = (): boolean => {
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const licenseService = useLicense();

  return hasEntityAnalyticsCapability && licenseService.isEnterprise();
};
