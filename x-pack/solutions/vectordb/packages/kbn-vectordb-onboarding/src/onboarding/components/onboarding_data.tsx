/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  GENERATE_VECTORS_INGEST_SNIPPETS,
  GENERATE_VECTORS_SEARCH_SNIPPETS,
  HAVE_VECTORS_INGEST_SNIPPETS,
  HAVE_VECTORS_SEARCH_SNIPPETS,
} from './language_snippets';
import {
  GENERATE_VECTORS_INGEST,
  GENERATE_VECTORS_SEARCH,
  HAVE_VECTORS_INGEST,
  HAVE_VECTORS_SEARCH,
} from './snippets';

export const getStepContent = (docLinks: DocLinksStart) => ({
  generate: {
    ingest: {
      title: i18n.translate('vectordbOnboarding.generate.ingest.title', {
        defaultMessage: 'Generate vectors',
      }),
      description: (
        <FormattedMessage
          id="vectordbOnboarding.generate.ingest.description"
          defaultMessage="Use {semanticText} to automatically generate embeddings at index time. Just send your text — Elasticsearch handles vectorization with built-in Jina models."
          values={{
            semanticText: <EuiCode>semantic_text</EuiCode>,
          }}
        />
      ),
      docsLabel: i18n.translate('vectordbOnboarding.generate.ingest.docsLabel', {
        defaultMessage: 'Learn more',
      }),
      docsHref: docLinks.links.enterpriseSearch.semanticTextField,
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.generate.ingest.consoleComment', {
          defaultMessage: 'VectorDB Onboarding: Generate Vectors',
        }),
        snippets: GENERATE_VECTORS_INGEST_SNIPPETS,
        request: GENERATE_VECTORS_INGEST,
      },
      infoPanel: {
        title: i18n.translate('vectordbOnboarding.generate.ingest.infoPanel.title', {
          defaultMessage: 'How semantic_text works',
        }),
        description: (
          <FormattedMessage
            id="vectordbOnboarding.generate.ingest.infoPanel.description"
            defaultMessage="The {semanticText} field type automatically generates embeddings using built-in Jina models. No additional configuration or external inference services required."
            values={{
              semanticText: <EuiCode>semantic_text</EuiCode>,
            }}
          />
        ),
        docsLabel: i18n.translate('vectordbOnboarding.generate.ingest.infoPanel.docsLabel', {
          defaultMessage: 'Search docs',
        }),
        docsHref: docLinks.links.enterpriseSearch.semanticSearch,
      },
    },
    search: {
      title: i18n.translate('vectordbOnboarding.generate.search.title', {
        defaultMessage: 'Search your data',
      }),
      description: (
        <FormattedMessage
          id="vectordbOnboarding.generate.search.description"
          defaultMessage="Query your {semanticText} field using natural language. Elasticsearch converts your query to a vector and finds the most relevant matches."
          values={{
            semanticText: <EuiCode>semantic_text</EuiCode>,
          }}
        />
      ),
      docsLabel: i18n.translate('vectordbOnboarding.generate.search.docsLabel', {
        defaultMessage: 'Search docs',
      }),
      docsHref: docLinks.links.enterpriseSearch.semanticSearch,
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.generate.search.consoleComment', {
          defaultMessage: 'VectorDB Onboarding: Search Data',
        }),
        snippets: GENERATE_VECTORS_SEARCH_SNIPPETS,
        request: GENERATE_VECTORS_SEARCH,
      },
      infoPanel: {
        title: i18n.translate('vectordbOnboarding.generate.search.infoPanel.title', {
          defaultMessage: 'Semantic search explained',
        }),
        description: i18n.translate('vectordbOnboarding.generate.search.infoPanel.description', {
          defaultMessage:
            'The semantic query automatically vectorizes your search text and performs a similarity search. Results are ranked by semantic relevance, not just keyword matches.',
        }),
        docsLabel: i18n.translate('vectordbOnboarding.generate.search.infoPanel.docsLabel', {
          defaultMessage: 'Search docs',
        }),
        docsHref: docLinks.links.enterpriseSearch.semanticSearch,
      },
    },
  },
  have_vectors: {
    ingest: {
      title: i18n.translate('vectordbOnboarding.haveVectors.ingest.title', {
        defaultMessage: 'Ingest vectors',
      }),
      description: i18n.translate('vectordbOnboarding.haveVectors.ingest.description', {
        defaultMessage:
          'Store your pre-computed embeddings in a dense_vector field with optimized settings for fast similarity search.',
      }),
      docsLabel: i18n.translate('vectordbOnboarding.haveVectors.ingest.docsLabel', {
        defaultMessage: 'Learn more',
      }),
      docsHref: docLinks.links.enterpriseSearch.knnSearch,
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.haveVectors.ingest.consoleComment', {
          defaultMessage: 'VectorDB Onboarding: Ingest Data',
        }),
        snippets: HAVE_VECTORS_INGEST_SNIPPETS,
        request: HAVE_VECTORS_INGEST,
      },
      infoPanel: {
        title: i18n.translate('vectordbOnboarding.haveVectors.ingest.infoPanel.title', {
          defaultMessage: 'Configuring dense_vector',
        }),
        description: i18n.translate('vectordbOnboarding.haveVectors.ingest.infoPanel.description', {
          defaultMessage:
            'Set dims to match your embedding model output dimensionality. Choose a similarity metric (cosine, dot_product, or l2_norm) that aligns with how your vectors were trained.',
        }),
        docsLabel: i18n.translate('vectordbOnboarding.haveVectors.ingest.infoPanel.docsLabel', {
          defaultMessage: 'Search docs',
        }),
        docsHref: docLinks.links.enterpriseSearch.semanticSearch,
      },
    },
    search: {
      title: i18n.translate('vectordbOnboarding.haveVectors.search.title', {
        defaultMessage: 'Search using kNN',
      }),
      description: i18n.translate('vectordbOnboarding.haveVectors.search.description', {
        defaultMessage:
          'Run approximate k-nearest neighbor (kNN) queries to find vectors most similar to your query embedding.',
      }),
      docsLabel: i18n.translate('vectordbOnboarding.haveVectors.search.docsLabel', {
        defaultMessage: 'Search docs',
      }),
      docsHref: docLinks.links.enterpriseSearch.knnSearch,
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.haveVectors.search.consoleComment', {
          defaultMessage: 'VectorDB Onboarding: Search Data',
        }),
        snippets: HAVE_VECTORS_SEARCH_SNIPPETS,
        request: HAVE_VECTORS_SEARCH,
      },
      infoPanel: {
        title: i18n.translate('vectordbOnboarding.haveVectors.search.infoPanel.title', {
          defaultMessage: 'Tuning kNN search',
        }),
        description: i18n.translate('vectordbOnboarding.haveVectors.search.infoPanel.description', {
          defaultMessage:
            'Increase num_candidates for higher recall at the cost of latency. Use k to control how many results to return. For exact search, use a script_score query instead.',
        }),
        docsLabel: i18n.translate('vectordbOnboarding.haveVectors.search.infoPanel.docsLabel', {
          defaultMessage: 'Search docs',
        }),
        docsHref: docLinks.links.enterpriseSearch.semanticSearch,
      },
    },
  },
});

export const generateTags = [
  i18n.translate('vectordbOnboarding.pathSelection.generate.tag1', {
    defaultMessage: 'Jina models',
  }),
  i18n.translate('vectordbOnboarding.pathSelection.generate.tag2', {
    defaultMessage: 'Semantic search',
  }),
  i18n.translate('vectordbOnboarding.pathSelection.generate.tag3', {
    defaultMessage: 'No config needed',
  }),
];

export const storeTags = [
  i18n.translate('vectordbOnboarding.pathSelection.store.tag1', {
    defaultMessage: 'Intelligent mapping',
  }),
  i18n.translate('vectordbOnboarding.pathSelection.store.tag2', {
    defaultMessage: 'Optimized storage settings',
  }),
];
