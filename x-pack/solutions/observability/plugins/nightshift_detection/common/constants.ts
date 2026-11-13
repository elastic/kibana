/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PricingProductFeature } from '@kbn/core-pricing-common';

/** Pricing feature that gates the detection engine. */
export const NIGHTSHIFT_DETECTION_TIERED_FEATURE: PricingProductFeature = {
  id: 'nightshift:detection-engine',
  description: 'Enable the Nightshift detection engine',
  products: [{ name: 'observability', tier: 'complete' }],
};

export const NIGHTSHIFT_DETECTION_TIERED_FEATURES = [NIGHTSHIFT_DETECTION_TIERED_FEATURE];
