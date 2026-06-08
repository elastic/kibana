/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocLinksStart } from '@kbn/core/public';

export interface TutorialContent {
  /** Stable id used for localStorage progress tracking. */
  id: string;
  title: string;
  description: string;
  /** Topic category label (e.g. Documentation, Article, Notebook). */
  topic: string;
  /** EUI icon shown inside the topic badge. */
  icon: IconType;
  href: string;
  /** Set to `'_blank'` for external URLs; omit for in-app routes. */
  target?: '_blank';
}

const DOCUMENTATION_LABEL = i18n.translate(
  'vectordbOnboarding.tutorials.topic.documentation.label',
  {
    defaultMessage: 'Documentation',
  }
);

const ARTICLE_LABEL = i18n.translate('vectordbOnboarding.tutorials.topic.article.label', {
  defaultMessage: 'Article',
});

const NOTEBOOK_LABEL = i18n.translate('vectordbOnboarding.tutorials.topic.notebook.label', {
  defaultMessage: 'Notebook',
});

export const getTutorialContent = (docLinks: DocLinksStart): TutorialContent[] => [
  {
    id: 'hybrid-search-semantic_text-documentation',
    topic: DOCUMENTATION_LABEL,
    icon: 'documents',
    href: docLinks.links.enterpriseSearch.knnSearchCombine,
    target: '_blank',
    title: i18n.translate('vectordbOnboarding.tutorials.hybridSearchSemanticText.title', {
      defaultMessage: 'Hybrid search with semantic_text',
    }),
    description: i18n.translate(
      'vectordbOnboarding.tutorials.hybridSearchSemanticText.description',
      {
        defaultMessage:
          'This tutorial walks you through hybrid search using the semantic_text field type together with a text field for lexical search.',
      }
    ),
  },
  {
    id: 'bring-your-own-dense-vectors-article',
    topic: ARTICLE_LABEL,
    icon: 'globe',
    href: docLinks.links.enterpriseSearch.knnSearchCombine,
    target: '_blank',
    title: i18n.translate('vectordbOnboarding.tutorials.bringYourOwnDenseVectorsArticle.title', {
      defaultMessage: 'Bring your own dense vectors to Elasticsearch',
    }),
    description: i18n.translate(
      'vectordbOnboarding.tutorials.bringYourOwnDenseVectorsArticle.description',
      {
        defaultMessage:
          'Store and search dense vectors in Elasticsearch and then run k-nearest neighbor (kNN) queries.',
      }
    ),
  },
  {
    id: 'auto-embed-semantic-text-article',
    topic: ARTICLE_LABEL,
    icon: 'globe',
    href: docLinks.links.enterpriseSearch.knnSearchCombine,
    target: '_blank',
    title: i18n.translate('vectordbOnboarding.tutorials.autoEmbedSemanticTextArticle.title', {
      defaultMessage: 'Auto-embed with semantic_text',
    }),
    description: i18n.translate(
      'vectordbOnboarding.tutorials.autoEmbedSemanticTextArticle.description',
      {
        defaultMessage:
          'Skip the embedding step and let Elasticsearch generate vectors for you on ingest and at query time.',
      }
    ),
  },
  {
    id: 'hybrid-search-semantic_text-notebook',
    topic: NOTEBOOK_LABEL,
    icon: 'training',
    href: docLinks.links.enterpriseSearch.knnSearchCombine,
    target: '_blank',
    title: i18n.translate('vectordbOnboarding.tutorials.hybridSearchSemanticTextNotebook.title', {
      defaultMessage: 'Hybrid search with semantic_text',
    }),
    description: i18n.translate(
      'vectordbOnboarding.tutorials.hybridSearchSemanticTextNotebook.description',
      {
        defaultMessage:
          'This tutorial walks you through hybrid search using the semantic_text field type together with a text field for lexical search.',
      }
    ),
  },
  {
    id: 'bring-your-own-dense-vectors-documentation',
    topic: DOCUMENTATION_LABEL,
    icon: 'documents',
    href: docLinks.links.enterpriseSearch.knnSearchCombine,
    target: '_blank',
    title: i18n.translate(
      'vectordbOnboarding.tutorials.bringYourOwnDenseVectorsDocumentation.title',
      {
        defaultMessage: 'Bring your own dense vectors to Elasticsearch',
      }
    ),
    description: i18n.translate(
      'vectordbOnboarding.tutorials.bringYourOwnDenseVectorsDocumentation.description',
      {
        defaultMessage:
          'Store and search dense vectors in Elasticsearch and then run k-nearest neighbor (kNN) queries.',
      }
    ),
  },
  {
    id: 'auto-embed-semantic-text-notebook',
    topic: NOTEBOOK_LABEL,
    icon: 'training',
    href: docLinks.links.enterpriseSearch.knnSearchCombine,
    target: '_blank',
    title: i18n.translate('vectordbOnboarding.tutorials.autoEmbedSemanticTextNotebook.title', {
      defaultMessage: 'Auto-embed with semantic_text',
    }),
    description: i18n.translate(
      'vectordbOnboarding.tutorials.autoEmbedSemanticTextNotebook.description',
      {
        defaultMessage:
          'Skip the embedding step and let Elasticsearch generate vectors for you on ingest and at query time.',
      }
    ),
  },
];
