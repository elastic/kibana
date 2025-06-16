/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityOnboardingAppServices } from '../../..';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';

export function usePricingFeature(
  feature: ObservabilityOnboardingPricingFeature,
  defaultValue = true
): boolean {
  const {
    services: { pricing },
  } = useKibana<ObservabilityOnboardingAppServices>();

  return pricing?.isFeatureAvailable(feature) ?? defaultValue;
}
