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
        defaultMessage: 'Generate embeddings from your content',
      }),
      description: i18n.translate('vectordbOnboarding.generate.ingest.description', {
        defaultMessage:
          'Run this sample script to ingest your data and generate embeddings using Jina’s embedding models with no extra configuration.',
      }),
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.generate.ingest.consoleComment', {
          defaultMessage: 'Vector DB Onboarding: Generate Vectors',
        }),
        snippets: GENERATE_VECTORS_INGEST_SNIPPETS,
        request: GENERATE_VECTORS_INGEST,
      },
      infoPanel: [
        {
          id: 'howSemanticWorks',
          title: i18n.translate('vectordbOnboarding.generate.ingest.infoPanel.title', {
            defaultMessage: 'How semantic search works',
          }),
          description: (
            <FormattedMessage
              id="vectordbOnboarding.generate.ingest.infoPanel.description"
              defaultMessage="The {semanticText} field type automatically generates embeddings using built-in Jina models. No additional configuration or external inference services required."
              values={{
                semanticText: <EuiCode transparentBackground={true}>semantic_text</EuiCode>,
              }}
            />
          ),
          docsLabel: i18n.translate('vectordbOnboarding.generate.ingest.infoPanel.docsLabel', {
            defaultMessage: 'Explore semantic search',
          }),
          docsHref: docLinks.links.enterpriseSearch.semanticSearchGetStarted,
        },
      ],
    },
    search: {
      title: i18n.translate('vectordbOnboarding.generate.search.title', {
        defaultMessage: 'Search your data',
      }),
      description: i18n.translate('vectordbOnboarding.generate.search.description', {
        defaultMessage:
          'Query your index using natural language. Elasticsearch converts your query to a vector and finds the most relevant matches.',
      }),
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.generate.search.consoleComment', {
          defaultMessage: 'Vector DB Onboarding: Search Data',
        }),
        snippets: GENERATE_VECTORS_SEARCH_SNIPPETS,
        request: GENERATE_VECTORS_SEARCH,
      },
      infoPanel: [
        {
          id: 'semanticExplained',
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
      ],
    },
  },
  have_vectors: {
    ingest: {
      title: i18n.translate('vectordbOnboarding.haveVectors.ingest.title', {
        defaultMessage: 'Store your own embeddings',
      }),
      description: i18n.translate('vectordbOnboarding.haveVectors.ingest.description', {
        defaultMessage:
          'Run this sample script to import your pre-generated embeddings into storage built for vector search. Once ingested, they’re ready to query.',
      }),
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.haveVectors.ingest.consoleComment', {
          defaultMessage: 'Vector DB Onboarding: Ingest Data',
        }),
        snippets: HAVE_VECTORS_INGEST_SNIPPETS,
        request: HAVE_VECTORS_INGEST,
      },
      infoPanel: [
        {
          id: 'vectorQuantization',
          title: i18n.translate('vectordbOnboarding.haveVectors.ingest.infoPanel.title', {
            defaultMessage: 'What is vector quantization?',
          }),
          description: i18n.translate(
            'vectordbOnboarding.haveVectors.ingest.infoPanel.description',
            {
              defaultMessage:
                'Quantization reduces vector storage by mapping float values to lower-precision types. Elasticsearch supports int8, byte, and binary quantization, each offering a different balance between memory footprint and search accuracy.',
            }
          ),
          docsLabel: i18n.translate('vectordbOnboarding.haveVectors.ingest.infoPanel.docsLabel', {
            defaultMessage: 'Vector storage optimization',
          }),
          docsHref: docLinks.links.enterpriseSearch.vectorSearchStorageOptimization,
        },
      ],
    },
    search: {
      title: i18n.translate('vectordbOnboarding.haveVectors.search.title', {
        defaultMessage: 'Search your vectors',
      }),
      description: i18n.translate('vectordbOnboarding.haveVectors.search.description', {
        defaultMessage:
          'Query your data using natural language. Elasticsearch converts your query to a vector and finds the most relevant matches.',
      }),
      api: {
        consoleComment: i18n.translate('vectordbOnboarding.haveVectors.search.consoleComment', {
          defaultMessage: 'Vector DB Onboarding: Search Data',
        }),
        snippets: HAVE_VECTORS_SEARCH_SNIPPETS,
        request: HAVE_VECTORS_SEARCH,
      },
      infoPanel: [
        {
          id: 'visitPercentage',
          title: i18n.translate('vectordbOnboarding.haveVectors.search.infoPanel.title', {
            defaultMessage: 'Visit percentage and recall',
          }),
          description: i18n.translate(
            'vectordbOnboarding.haveVectors.search.infoPanel.description',
            {
              defaultMessage:
                'Vector search visits a percentage of your index to find the closest matches. A higher visit percentage means stronger recall. A lower visit percentage means faster queries at scale.',
            }
          ),
          docsLabel: i18n.translate('vectordbOnboarding.haveVectors.search.infoPanel.docsLabel', {
            defaultMessage: 'Find out more',
          }),
          docsHref: docLinks.links.enterpriseSearch.knnSearchTuneForSpeedAccuracy,
        },
      ],
    },
  },
});
