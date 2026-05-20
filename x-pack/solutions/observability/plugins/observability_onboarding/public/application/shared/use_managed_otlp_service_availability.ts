/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IS_MANAGED_OTLP_SERVICE_ENABLED } from '../../../common/feature_flags';
import type { ObservabilityOnboardingAppServices } from '../..';

export function useManagedOtlpServiceAvailability() {
  const {
    services: {
      featureFlags,
      observability,
      cloud,
      context: { isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  /**
   * mOTLP service is always available for Serverless projects
   */
  if (isServerless) {
    return true;
  }

  const isFeatureEnabled = featureFlags.getBooleanValue(IS_MANAGED_OTLP_SERVICE_ENABLED, false);
  // Prefer the cloud-provided URL; fall back to the deprecated observability config for
  // deployments whose cloud control plane has not yet migrated to `xpack.cloud.managed_otlp.url`.
  const managedOtlpServiceUrl =
    cloud?.managedOtlp?.url || observability.config.managedOtlpServiceUrl;

  return isFeatureEnabled && Boolean(managedOtlpServiceUrl);
}
