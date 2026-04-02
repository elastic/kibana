/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceFeatureConfig } from '@kbn/search-inference-endpoints/server';
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_INFERENCE_PARENT_FEATURE_ID,
  OBSERVABILITY_AI_SETTINGS_SUBFEATURE_ID,
} from '../common/constants';

export const observabilityParentFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_INFERENCE_PARENT_FEATURE_ID,
  featureName: i18n.translate(
    'xpack.observabilityAgentBuilder.inferenceFeature.observabilityParentName',
    { defaultMessage: 'Observability' }
  ),
  featureDescription: i18n.translate(
    'xpack.observabilityAgentBuilder.inferenceFeature.observabilityParentDescription',
    { defaultMessage: 'Parent feature for Observability' }
  ),
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

const observabilityAiInsightsChatCompletionFeature: InferenceFeatureConfig = {
  featureId: OBSERVABILITY_AI_SETTINGS_SUBFEATURE_ID,
  parentFeatureId: OBSERVABILITY_INFERENCE_PARENT_FEATURE_ID,
  featureName: i18n.translate('xpack.observabilityAgentBuilder.inferenceFeature.aiSettingsName', {
    defaultMessage: 'Observability AI Settings',
  }),
  featureDescription: i18n.translate(
    'xpack.observabilityAgentBuilder.inferenceFeature.aiSettingsDescription',
    {
      defaultMessage:
        'Inference endpoint configuration for Observability AI Assistant + Contextual Insights, AI Insights (Observability Agent is configured separately in the Agent Builder feature)',
    }
  ),
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

export const observabilityAiInsightsInferenceFeatures: InferenceFeatureConfig[] = [
  observabilityAiInsightsChatCompletionFeature,
];
