/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface KnownModelGroup {
  groupId: string;
  groupLabel: string;
  groupTest: (modelId: string) => boolean;
}

export const KNOWN_MODEL_GROUPS: KnownModelGroup[] = [
  {
    groupId: 'elser_model',
    groupLabel: i18n.translate('xpack.searchInferenceEndpoints.knownModelGroups.elserModel.label', {
      defaultMessage: 'Elastic Learned Sparse EncodeR (ELSER)',
    }),
    groupTest: (modelId: string) => modelId.toLowerCase().includes('elser_model'),
  },
  {
    groupId: 'anthropic-claude',
    groupLabel: i18n.translate(
      'xpack.searchInferenceEndpoints.knownModelGroups.anthropicClaude.label',
      {
        defaultMessage: 'Anthropic Claude',
      }
    ),
    groupTest: (modelId: string) => modelId.toLowerCase().includes('claude'),
  },
  {
    groupId: 'google-gemini',
    groupLabel: i18n.translate(
      'xpack.searchInferenceEndpoints.knownModelGroups.googleGemini.label',
      {
        defaultMessage: 'Google Gemini',
      }
    ),
    groupTest: (modelId: string) => modelId.toLowerCase().includes('google-gemini'),
  },
  {
    groupId: 'jina',
    groupLabel: i18n.translate('xpack.searchInferenceEndpoints.knownModelGroups.jina.label', {
      defaultMessage: 'Jina AI',
    }),
    groupTest: (modelId: string) => modelId.toLowerCase().includes('jina'),
  },
  {
    groupId: 'openai-gpt',
    groupLabel: i18n.translate('xpack.searchInferenceEndpoints.knownModelGroups.openAIGPT.label', {
      defaultMessage: 'OpenAI GPT',
    }),
    groupTest: (modelId: string) => modelId.toLowerCase().includes('openai-gpt'),
  },
  {
    groupId: 'openai-text-embedding',
    groupLabel: i18n.translate('xpack.searchInferenceEndpoints.knownModelGroups.openAIText.label', {
      defaultMessage: 'OpenAI Text Embedding',
    }),
    groupTest: (modelId: string) => modelId.toLowerCase().includes('openai-text-embedding'),
  },
  {
    groupId: 'rainbow-sprinkles',
    groupLabel: i18n.translate(
      'xpack.searchInferenceEndpoints.knownModelGroups.elasticRainbowSprinkles.label',
      {
        defaultMessage: 'Elastic Inference Service',
      }
    ),
    groupTest: (modelId: string) => modelId.toLowerCase().includes('rainbow-sprinkles'),
  },
  {
    groupId: '.rerank-v1',
    groupLabel: i18n.translate(
      'xpack.searchInferenceEndpoints.knownModelGroups.elasticRerank.label',
      {
        defaultMessage: 'Elastic Rerank v1',
      }
    ),
    groupTest: (modelId: string) => modelId.toLowerCase().includes('.rerank-v1'),
  },
  {
    groupId: 'multilingual-e5',
    groupLabel: i18n.translate('xpack.searchInferenceEndpoints.knownModelGroups.e5.label', {
      defaultMessage: 'E5',
    }),
    groupTest: (modelId: string) => modelId.toLowerCase().includes('multilingual-e5'),
  },
];
