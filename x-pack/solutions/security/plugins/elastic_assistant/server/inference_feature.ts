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
import {
  AI_ASSISTANT_FEATURE_DESCRIPTION,
  AI_ASSISTANT_FEATURE_NAME,
  ELASTIC_AI_ASSISTANT_FEATURE_DESCRIPTION,
  ELASTIC_AI_ASSISTANT_FEATURE_NAME,
} from './inference_feature_translations';

export const aiAssistantParentInferenceFeature: InferenceFeatureConfig = {
  featureId: AI_ASSISTANT_INFERENCE_FEATURE_ID,
  featureName: AI_ASSISTANT_FEATURE_NAME,
  featureDescription: AI_ASSISTANT_FEATURE_DESCRIPTION,
  taskType: 'chat_completion',
  recommendedEndpoints: [defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION],
};

export const elasticAiAssistantInferenceFeature: InferenceFeatureConfig = {
  parentFeatureId: AI_ASSISTANT_INFERENCE_FEATURE_ID,
  featureId: ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID,
  featureName: ELASTIC_AI_ASSISTANT_FEATURE_NAME,
  featureDescription: ELASTIC_AI_ASSISTANT_FEATURE_DESCRIPTION,
  taskType: 'chat_completion',
  recommendedEndpoints: [
    defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_OPUS,
    defaultInferenceEndpoints.OPENAI_GPT_5_2,
    defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
  ],
};
