/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceFeatureConfig } from '@kbn/search-inference-endpoints/server';
import {
  OBSERVABILITY_INFERENCE_PARENT_FEATURE_ID,
  OBSERVABILITY_AI_INSIGHTS_INFERENCE_FEATURE_ID,
} from '../common/constants';

export const observabilityParentFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_INFERENCE_PARENT_FEATURE_ID,
  featureName: 'Observability',
  featureDescription: 'Parent feature for Observability',
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

const observabilityAiInsightsChatCompletionFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_AI_INSIGHTS_INFERENCE_FEATURE_ID,
  parentFeatureId: OBSERVABILITY_INFERENCE_PARENT_FEATURE_ID,
  featureName: 'AI Insights',
  featureDescription: 'AI Insights inference endpoint configuration',
  taskType: 'chat_completion',
  recommendedEndpoints: [
    '.anthropic-claude-4.6-sonnet-chat_completion',
    '.openai-gpt-5.2-chat_completion',
  ],
};

export const observabilityAiInsightsInferenceFeatures: InferenceFeatureConfig[] = [
  observabilityAiInsightsChatCompletionFeature,
];
