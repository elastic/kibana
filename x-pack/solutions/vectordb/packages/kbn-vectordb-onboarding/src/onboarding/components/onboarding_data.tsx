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
      description: i18n.translate('vectordbOnboarding.generate.ingest.description', {
        defaultMessage:
          "Just send your text. Elasticsearch's built-in Jina models will convert it into vectors automatically.",
      }),
      docsLabel: i18n.translate('vectordbOnboarding.generate.ingest.docsLabel', {
        defaultMessage: 'Learn more',
      }),
      docsHref: docLinks.links.enterpriseSearch.vectorSearchEmbeddingModels,
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.generate.ingest.consoleComment', {
          defaultMessage: 'Vector DB Onboarding: Generate Vectors',
        }),
        snippets: GENERATE_VECTORS_INGEST_SNIPPETS,
        request: GENERATE_VECTORS_INGEST,
      },
      infoPanel: {
        title: i18n.translate('vectordbOnboarding.generate.ingest.infoPanel.title', {
          defaultMessage: 'How semantic search works',
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
          defaultMessage: 'Explore semantic search',
        }),
        docsHref: docLinks.links.enterpriseSearch.semanticSearchGetStarted,
      },
    },
    search: {
      title: i18n.translate('vectordbOnboarding.generate.search.title', {
        defaultMessage: 'Search your vectors',
      }),
      description: i18n.translate('vectordbOnboarding.generate.search.description', {
        defaultMessage:
          'Query your data using natural language. Elasticsearch converts your query to a vector and finds the most relevant matches.',
      }),
      docsLabel: i18n.translate('vectordbOnboarding.generate.search.docsLabel', {
        defaultMessage: 'How it works',
      }),
      docsHref: docLinks.links.enterpriseSearch.semanticSearch,
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.generate.search.consoleComment', {
          defaultMessage: 'Vector DB Onboarding: Search Data',
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
            'The semantic query automatically vectorizes your search text and performs a similarity search by meaning. Results are ranked by semantic relevance, not keyword matches.',
        }),
        docsLabel: i18n.translate('vectordbOnboarding.generate.search.infoPanel.docsLabel', {
          defaultMessage: 'Core concepts',
        }),
        docsHref: docLinks.links.enterpriseSearch.vectorSearchVectorsAndEmbeddings,
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
          'Store your pre-computed embeddings and make them available for vector search.',
      }),
      docsLabel: i18n.translate('vectordbOnboarding.haveVectors.ingest.docsLabel', {
        defaultMessage: 'Learn more',
      }),
      docsHref: docLinks.links.enterpriseSearch.vectorSearchBringOwnVectors,
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.haveVectors.ingest.consoleComment', {
          defaultMessage: 'Vector DB Onboarding: Ingest Data',
        }),
        snippets: HAVE_VECTORS_INGEST_SNIPPETS,
        request: HAVE_VECTORS_INGEST,
      },
      infoPanel: {
        title: i18n.translate('vectordbOnboarding.haveVectors.ingest.infoPanel.title', {
          defaultMessage: 'What is vector quantization?',
        }),
        description: i18n.translate('vectordbOnboarding.haveVectors.ingest.infoPanel.description', {
          defaultMessage:
            'Quantization reduces vector storage by mapping float values to lower-precision types. Elasticsearch supports int8, byte, and binary quantization, each offering a different balance between memory footprint and search accuracy.',
        }),
        docsLabel: i18n.translate('vectordbOnboarding.haveVectors.ingest.infoPanel.docsLabel', {
          defaultMessage: 'Vector storage optimization',
        }),
        docsHref: docLinks.links.enterpriseSearch.vectorSearchStorageOptimization,
      },
    },
    search: {
      title: i18n.translate('vectordbOnboarding.haveVectors.search.title', {
        defaultMessage: 'Search your vectors',
      }),
      description: i18n.translate('vectordbOnboarding.haveVectors.search.description', {
        defaultMessage:
          'Run vector search queries to find the closest vectors to your query embedding.',
      }),
      docsLabel: i18n.translate('vectordbOnboarding.haveVectors.search.docsLabel', {
        defaultMessage: 'About kNN search',
      }),
      docsHref: docLinks.links.enterpriseSearch.knnSearch,
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.haveVectors.search.consoleComment', {
          defaultMessage: 'Vector DB Onboarding: Search Data',
        }),
        snippets: HAVE_VECTORS_SEARCH_SNIPPETS,
        request: HAVE_VECTORS_SEARCH,
      },
      infoPanel: {
        title: i18n.translate('vectordbOnboarding.haveVectors.search.infoPanel.title', {
          defaultMessage: 'Visit percentage and recall',
        }),
        description: i18n.translate('vectordbOnboarding.haveVectors.search.infoPanel.description', {
          defaultMessage:
            'Vector search visits a percentage of your index to find the closest matches. A higher visit percentage means stronger recall. A lower visit percentage means faster queries at scale.',
        }),
        docsLabel: i18n.translate('vectordbOnboarding.haveVectors.search.infoPanel.docsLabel', {
          defaultMessage: 'Find out more',
        }),
        docsHref: docLinks.links.enterpriseSearch.knnSearchTuneForSpeedAccuracy,
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
