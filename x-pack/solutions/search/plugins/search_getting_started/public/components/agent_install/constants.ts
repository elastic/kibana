/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type UseCaseId =
  | 'general-search'
  | 'semantic-search'
  | 'vector-database'
  | 'rag-chatbot'
  | 'keyword-search'
  | 'hybrid-search'
  | 'catalog-ecommerce';

export type Environment = 'cursor' | 'cli' | 'agent-builder';

interface UseCaseOption {
  id: UseCaseId;
  label: string;
}

export const USE_CASE_OPTIONS: UseCaseOption[] = [
  {
    id: 'general-search',
    label: i18n.translate('xpack.gettingStarted.agentInstall.useCase.generalSearch', {
      defaultMessage: 'General search',
    }),
  },
  {
    id: 'semantic-search',
    label: i18n.translate('xpack.gettingStarted.agentInstall.useCase.semanticSearch', {
      defaultMessage: 'Semantic search',
    }),
  },
  {
    id: 'vector-database',
    label: i18n.translate('xpack.gettingStarted.agentInstall.useCase.vectorDatabase', {
      defaultMessage: 'Vector database',
    }),
  },
  {
    id: 'rag-chatbot',
    label: i18n.translate('xpack.gettingStarted.agentInstall.useCase.ragChat', {
      defaultMessage: 'RAG chat',
    }),
  },
  {
    id: 'keyword-search',
    label: i18n.translate('xpack.gettingStarted.agentInstall.useCase.keywordSearch', {
      defaultMessage: 'Keyword search',
    }),
  },
  {
    id: 'hybrid-search',
    label: i18n.translate('xpack.gettingStarted.agentInstall.useCase.hybridSearch', {
      defaultMessage: 'Hybrid search',
    }),
  },
  {
    id: 'catalog-ecommerce',
    label: i18n.translate('xpack.gettingStarted.agentInstall.useCase.catalogSearch', {
      defaultMessage: 'Catalog search',
    }),
  },
];

export const INSTALL_SKILL_CMD =
  'npx skills add elastic/agent-skills --skill elasticsearch-onboarding -y';

export const INSTALL_LINES_CURSOR = [
  'Install the elasticsearch onboarding skill:',
  '```sh\n' + INSTALL_SKILL_CMD + ' -a cursor' + '\n```',
];

export const INSTALL_LINES_CLI = [
  'Install the elasticsearch onboarding plugin:',
  '```sh\n' + INSTALL_SKILL_CMD + '\n```',
];

export const USE_CASE_MESSAGES: Record<UseCaseId, string> = {
  'general-search': 'Help me get started with Elasticsearch.',
  'semantic-search': 'I want to build semantic search with Elasticsearch.',
  'vector-database': 'I want to use Elasticsearch as a vector database for my AI app.',
  'rag-chatbot': 'I want to build a RAG chatbot that answers questions from my data.',
  'keyword-search': 'I want to build keyword search with filters and autocomplete.',
  'hybrid-search': 'I want to build hybrid search combining keyword and semantic.',
  'catalog-ecommerce':
    'I want to build product search for an e-commerce catalog with facets and autocomplete.',
};
