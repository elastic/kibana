/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { InferenceFeatureConfig } from '@kbn/search-inference-endpoints/server';
import {
  SECURITY_INFERENCE_PARENT_FEATURE_ID,
  ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID,
} from '../common/constants';
import {
  SECURITY_FEATURE_DESCRIPTION,
  SECURITY_FEATURE_NAME,
  ELASTIC_AI_ASSISTANT_FEATURE_DESCRIPTION,
  ELASTIC_AI_ASSISTANT_FEATURE_NAME,
} from './inference_feature_translations';

export const securityParentInferenceFeature: InferenceFeatureConfig = {
  featureId: SECURITY_INFERENCE_PARENT_FEATURE_ID,
  featureName: SECURITY_FEATURE_NAME,
  featureDescription: SECURITY_FEATURE_DESCRIPTION,
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

export const elasticAiAssistantInferenceFeature: InferenceFeatureConfig = {
  parentFeatureId: SECURITY_INFERENCE_PARENT_FEATURE_ID,
  featureId: ELASTIC_AI_ASSISTANT_INFERENCE_FEATURE_ID,
  featureName: ELASTIC_AI_ASSISTANT_FEATURE_NAME,
  featureDescription: ELASTIC_AI_ASSISTANT_FEATURE_DESCRIPTION,
  taskType: 'chat_completion',
  recommendedEndpoints: [
    defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_OPUS,
    defaultInferenceEndpoints.OPENAI_GPT_5_2,
    defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
  ],
  visibilityCondition: {
    key: 'aiAssistant:preferredChatExperience',
    value: AIChatExperience.Classic,
  },
};
