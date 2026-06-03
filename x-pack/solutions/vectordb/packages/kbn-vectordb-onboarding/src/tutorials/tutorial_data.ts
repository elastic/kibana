/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { ApplicationStart, DocLinksStart } from '@kbn/core/public';

export interface Tutorial {
  /** Stable id used for localStorage progress tracking. */
  id: string;
  title: string;
  description: string;
  icon: IconType;
  /** Navigation target — in-app sub-route or absolute external URL. */
  href: string;
  /** Set to `'_blank'` for external URLs; omit for in-app routes. */
  target?: '_blank';
  /** Estimated effort, shown as a small badge. */
  duration: string;
  /** Free-form tag chips. */
  tags: readonly string[];
}

/** ID of the onboarding-wizard tutorial. The wizard's Done button marks this complete. */
export const ONBOARDING_TUTORIAL_ID = 'onboarding-wizard';

/**
 * Tutorials are produced from `docLinks` so external hrefs always match
 * Kibana's source of truth for Elastic documentation URLs (no hard-coded
 * paths that can rot).
 */
export const getTutorials = (
  docLinks: DocLinksStart,
  application: ApplicationStart
): readonly Tutorial[] => [
  {
    id: ONBOARDING_TUTORIAL_ID,
    title: 'Onboarding: ingest and search vectors',
    description:
      'A 3-step walkthrough that creates an index, loads a few documents, and runs your first vector query.',
    icon: 'rocket',
    href: application.getUrlForApp('vectordb', { path: '/onboarding' }),
    duration: '5 min',
    tags: ['Beginner', 'Wizard'],
  },
  {
    id: 'hybrid-search',
    title: 'Hybrid search: combine kNN with BM25',
    description:
      'Boost recall by combining lexical and vector retrieval into a single ranked result set.',
    icon: 'visBarHorizontalStacked',
    href: docLinks.links.enterpriseSearch.knnSearchCombine,
    target: '_blank',
    duration: '15 min',
    tags: ['Intermediate', 'Hybrid'],
  },
  {
    id: 'rag-playground',
    title: 'Try the chat Playground',
    description:
      'Wire vector search into a retrieval-augmented generation flow with the in-Kibana Playground.',
    icon: 'sparkles',
    href: docLinks.links.playground.chatPlayground,
    target: '_blank',
    duration: '15 min',
    tags: ['RAG', 'Playground'],
  },
  {
    id: 'semantic-search',
    title: 'Auto-embed with semantic_text',
    description:
      'Skip the embedding step and let Elasticsearch generate vectors for you on ingest and at query time.',
    icon: 'tokenSemanticText',
    href: docLinks.links.enterpriseSearch.semanticSearch,
    target: '_blank',
    duration: '10 min',
    tags: ['Beginner', 'semantic_text'],
  },
];
