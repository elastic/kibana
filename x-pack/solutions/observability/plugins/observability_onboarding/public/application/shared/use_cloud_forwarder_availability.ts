/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IS_EDOT_CLOUD_FORWARDER_ENABLED } from '../../../common/feature_flags';
import type { ObservabilityOnboardingAppServices } from '../..';

/**
 * Hook to determine if the EDOT Cloud Forwarder onboarding flow is available.
 *
 * - Always available for Serverless projects (already deployed and working)
 * - For Cloud (ECH), controlled by LaunchDarkly feature flag
 * - Not available for on-premise deployments
 */
export function useCloudForwarderAvailability() {
  const {
    services: {
      featureFlags,
      context: { isServerless, isCloud },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  /**
   * Cloud Forwarder is always available for Serverless projects
   */
  if (isServerless) {
    return true;
  }

  /**
   * For Cloud (ECH), check the LaunchDarkly feature flag
   */
  if (isCloud) {
    return featureFlags.getBooleanValue(IS_EDOT_CLOUD_FORWARDER_ENABLED, false);
  }

  /**
   * Not available for on-premise deployments
   */
  return false;
}
