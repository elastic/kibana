/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceFeatureConfig } from '@kbn/search-inference-endpoints/server';
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_AI_INSIGHTS_INFERENCE_PARENT_FEATURE_ID,
  OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID,
} from '../common/constants';

export const observabilityParentFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_AI_INSIGHTS_INFERENCE_PARENT_FEATURE_ID,
  featureName: i18n.translate(
    'xpack.observabilityAgentBuilder.inferenceFeature.observabilityParentName',
    { defaultMessage: 'Observability AI Insights' }
  ),
  featureDescription: i18n.translate(
    'xpack.observabilityAgentBuilder.inferenceFeature.observabilityParentDescription',
    { defaultMessage: 'Inference endpoint settings for Observability AI Insights features' }
  ),
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

const observabilityAiInsightsChatCompletionFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID,
  parentFeatureId: OBSERVABILITY_AI_INSIGHTS_INFERENCE_PARENT_FEATURE_ID,
  featureName: i18n.translate('xpack.observabilityAgentBuilder.inferenceFeature.aiSettingsName', {
    defaultMessage: 'AI Insights',
  }),
  featureDescription: i18n.translate(
    'xpack.observabilityAgentBuilder.inferenceFeature.aiSettingsDescription',
    {
      defaultMessage: 'The model powering AI-driven analysis in Observability AI Insights.',
    }
  ),
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

export const observabilityAiInsightsInferenceFeatures: InferenceFeatureConfig[] = [
  observabilityAiInsightsChatCompletionFeature,
];
