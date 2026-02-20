/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ELASTIC_GROUP_ID = 'elastic';

export interface KnownModelGroup {
  groupId: string;
  groupLabel: string;
  groupTest: (modelId: string) => boolean;
}

export const KNOWN_MODEL_GROUPS: KnownModelGroup[] = [
  {
    groupId: ELASTIC_GROUP_ID,
    groupLabel: i18n.translate('xpack.searchInferenceEndpoints.knownModelGroups.elastic.label', {
      defaultMessage: 'Elastic',
    }),
    groupTest: (modelId: string) => {
      const normalizedModelId = modelId.toLowerCase();
      return (
        normalizedModelId.includes('elser_model') ||
        normalizedModelId.includes('jina') ||
        normalizedModelId.includes('rainbow-sprinkles') ||
        normalizedModelId.includes('.rerank-v1')
      );
    },
  },
  {
    groupId: 'anthropic',
    groupLabel: i18n.translate('xpack.searchInferenceEndpoints.knownModelGroups.anthropic.label', {
      defaultMessage: 'Anthropic',
    }),
    groupTest: (modelId: string) => {
      const normalizedModelId = modelId.toLowerCase();
      return normalizedModelId.includes('claude') || normalizedModelId.includes('anthropic');
    },
  },
  {
    groupId: 'google',
    groupLabel: i18n.translate('xpack.searchInferenceEndpoints.knownModelGroups.google.label', {
      defaultMessage: 'Google',
    }),
    groupTest: (modelId: string) => {
      const normalizedModelId = modelId.toLowerCase();
      return (
        normalizedModelId.includes('google-gemini') ||
        normalizedModelId.includes('google') ||
        normalizedModelId.includes('gemini')
      );
    },
  },
  {
    groupId: 'openai',
    groupLabel: i18n.translate('xpack.searchInferenceEndpoints.knownModelGroups.openAI.label', {
      defaultMessage: 'OpenAI',
    }),
    groupTest: (modelId: string) => {
      const normalizedModelId = modelId.toLowerCase();
      return (
        normalizedModelId.includes('openai-gpt') ||
        normalizedModelId.includes('openai-text-embedding') ||
        normalizedModelId.includes('openai')
      );
    },
  },
  {
    groupId: 'multilingual-e5',
    groupLabel: i18n.translate('xpack.searchInferenceEndpoints.knownModelGroups.e5.label', {
      defaultMessage: 'Multilingual E5',
    }),
    groupTest: (modelId: string) => modelId.toLowerCase().includes('multilingual-e5'),
  },
];
