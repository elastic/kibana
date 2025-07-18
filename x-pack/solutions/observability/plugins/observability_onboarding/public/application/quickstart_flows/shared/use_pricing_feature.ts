/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../hooks/use_kibana';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';

export function usePricingFeature(feature: ObservabilityOnboardingPricingFeature): boolean {
  const {
    services: { pricing },
  } = useKibana();

  return pricing.isFeatureAvailable(feature);
}
