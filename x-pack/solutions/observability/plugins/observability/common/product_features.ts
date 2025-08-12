/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PricingProductFeature } from '@kbn/core-pricing-common';

/**
 * Tiered features
 */
export const OBSERVABILITY_COMPLETE_LANDING_PAGE_FEATURE: PricingProductFeature = {
  id: 'observability:complete-landing-page',
  description: 'Enable complete landing page assertions and navigation',
  products: [{ name: 'observability', tier: 'complete' }],
};

export const OBSERVABILITY_TIERED_FEATURES = [OBSERVABILITY_COMPLETE_LANDING_PAGE_FEATURE];
