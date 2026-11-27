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

/** Base path of the engine's internal routes. */
export const DETECTION_ENGINE_API_PATH = '/internal/nightshift/detection';

/**
 * App id of the engine inspector, a temporary page for the engine's developers. It has no nav
 * link and is deleted before the plugin is turned on anywhere.
 */
export const DETECTION_INSPECTOR_APP_ID = 'nightshiftDetectionDebug';

/** `source` of every signal the engine writes. */
export const DETECTION_SIGNAL_SOURCE = 'elastic.nightshift_detection_engine';
