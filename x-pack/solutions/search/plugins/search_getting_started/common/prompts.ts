/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SuggestedPrompt {
  id: string;
  prompt: string;
}

export const DEFAULT_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'chatbot_my_data',
    prompt: 'I want to build a chatbot that answers questions from my data',
  },
  {
    id: 'recommendations',
    prompt: "Add 'you may like' recommendations to my app",
  },
  {
    id: 'product_search',
    prompt: 'Build product search with filters, autocomplete and facets',
  },
  {
    id: 'geo_filters',
    prompt: "Help me build 'near me' search with geo filters",
  },
  {
    id: 'logs',
    prompt: 'I need to search and analyze my applications logs',
  },
  {
    id: 'docs_search',
    prompt: 'Make my docs and wiki searchable',
  },
];
