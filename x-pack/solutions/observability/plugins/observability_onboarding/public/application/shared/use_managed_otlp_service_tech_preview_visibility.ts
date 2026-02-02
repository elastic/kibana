/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IS_MANAGED_OTLP_GA } from '../../../common/feature_flags';
import type { ObservabilityOnboardingAppServices } from '../..';
import { useManagedOtlpServiceAvailability } from './use_managed_otlp_service_availability';

/**
 * Returns whether the Technical Preview badge should be shown for OTel onboarding flows.
 *
 * The badge should be shown when ALL of the following conditions are met:
 * - Not running on Serverless (mOTLP is already GA in Serverless)
 * - mOTLP service is available (URL is configured and feature flag enabled)
 * - mOTLP is not yet GA (managedOtlpGa feature flag is false)
 */
export function useManagedOtlpServiceTechPreviewVisibility(): boolean {
  const {
    services: {
      featureFlags,
      context: { isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();

  // mOTLP is already GA in Serverless, never show the badge
  if (isServerless) {
    return false;
  }

  // Only show the badge when mOTLP service is available (ECH with URL configured)
  if (!isManagedOtlpServiceAvailable) {
    return false;
  }

  // Hide the badge when mOTLP goes GA (feature flag is true)
  const isManagedOtlpGa = featureFlags.getBooleanValue(IS_MANAGED_OTLP_GA, false);

  return !isManagedOtlpGa;
}
