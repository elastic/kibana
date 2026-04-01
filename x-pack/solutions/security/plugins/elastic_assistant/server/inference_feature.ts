/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { InferenceFeatureConfig } from '@kbn/search-inference-endpoints/server';
import {
  AI_ASSISTANT_INFERENCE_FEATURE_ID,
  ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID,
} from '../common/constants';

export const aiAssistantParentInferenceFeature: InferenceFeatureConfig = {
  featureId: AI_ASSISTANT_INFERENCE_FEATURE_ID,
  featureName: 'AI Assistant',
  featureDescription: 'Parent feature for AI Assistant',
  taskType: 'chat_completion',
  recommendedEndpoints: [defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION],
};

export const elasticAiAssistantInferenceFeature: InferenceFeatureConfig = {
  parentFeatureId: AI_ASSISTANT_INFERENCE_FEATURE_ID,
  featureId: ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID,
  featureName: 'AI Assistant for Security',
  featureDescription: 'AI Assistant for Security inference endpoint configuration',
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};
