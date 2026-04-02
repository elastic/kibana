/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceFeatureConfig } from '@kbn/search-inference-endpoints/server';
import {
  OBSERVABILITY_INFERENCE_PARENT_FEATURE_ID,
  OBSERVABILITY_AI_SETTINGS_SUBFEATURE_ID,
} from '../common/constants';

export const observabilityParentFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_INFERENCE_PARENT_FEATURE_ID,
  featureName: 'Observability',
  featureDescription: 'Parent feature for Observability',
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

const observabilityAiInsightsChatCompletionFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_AI_SETTINGS_SUBFEATURE_ID,
  parentFeatureId: OBSERVABILITY_INFERENCE_PARENT_FEATURE_ID,
  featureName: 'Observability AI Settings',
  featureDescription:
    'Inference endpoint configuration for Observability AI Assistant + Contextual Insights / Observability Agent + AI Insights',
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

export const observabilityAiInsightsInferenceFeatures: InferenceFeatureConfig[] = [
  observabilityAiInsightsChatCompletionFeature,
];
