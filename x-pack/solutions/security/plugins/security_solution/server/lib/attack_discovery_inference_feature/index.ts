/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_FRONTIER_RECOMMENDED_ENDPOINTS } from '@kbn/alertzero-common';
import type { InferenceFeatureConfig } from '@kbn/search-inference-endpoints/server';

/**
 * Returns the Attack Discovery Model Settings feature, which recommends the same frontier-class
 * models as the AlertZero Attack Discovery worker.
 */
export const getAttackDiscoveryInferenceFeature = ({
  parentFeatureId,
}: {
  parentFeatureId: string;
}): InferenceFeatureConfig => ({
  featureDescription: 'Attack Discovery inference endpoint configuration',
  featureId: 'attack_discovery',
  featureName: 'Attack Discovery',
  // Attack Discovery is a single pass over a batch of alerts, judged on the quality of one
  // output, so the global default model must not displace the curated frontier models. The
  // `defaultConnectorOnly` setting still wins, because it short-circuits feature resolution.
  ignoreGlobalDefault: true,
  parentFeatureId,
  recommendedEndpoints: [...ALERTZERO_FRONTIER_RECOMMENDED_ENDPOINTS],
  taskType: 'chat_completion',
});
