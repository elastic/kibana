/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface SuggestedPrompt {
  id: string;
  prompt: string;
}

export const DEFAULT_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'chatbot_my_data',
    prompt: i18n.translate('xpack.gettingStarted.chat.suggestedPrompt.chatbot_my_data', {
      defaultMessage: 'I want to build a chatbot that answers questions from my data',
    }),
  },
  {
    id: 'recommendations',
    prompt: i18n.translate('xpack.gettingStarted.chat.suggestedPrompt.recommendations', {
      defaultMessage: "Add 'you may like' recommendations to my app",
    }),
  },
  {
    id: 'product_search',
    prompt: i18n.translate('xpack.gettingStarted.chat.suggestedPrompt.product_search', {
      defaultMessage: 'Build product search with filters, autocomplete and facets',
    }),
  },
  {
    id: 'geo_filters',
    prompt: i18n.translate('xpack.gettingStarted.chat.suggestedPrompt.geo_filters', {
      defaultMessage: "Help me build 'near me' search with geo filters",
    }),
  },
  {
    id: 'logs',
    prompt: i18n.translate('xpack.gettingStarted.chat.suggestedPrompt.logs', {
      defaultMessage: 'I need to search and analyze my applications logs',
    }),
  },
  {
    id: 'docs_search',
    prompt: i18n.translate('xpack.gettingStarted.chat.suggestedPrompt.docs_search', {
      defaultMessage: 'Make my docs and wiki searchable',
    }),
  },
];
