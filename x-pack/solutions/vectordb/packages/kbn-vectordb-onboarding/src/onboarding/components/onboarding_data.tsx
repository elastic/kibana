/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiHorizontalRule, EuiLink } from '@elastic/eui';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  GENERATE_VECTORS_INGEST_SNIPPETS,
  GENERATE_VECTORS_SEARCH_HYBRID_SNIPPETS,
  GENERATE_VECTORS_SEARCH_SNIPPETS,
  HAVE_VECTORS_INGEST_SNIPPETS,
  HAVE_VECTORS_SEARCH_HYBRID_SNIPPETS,
  HAVE_VECTORS_SEARCH_SNIPPETS,
} from './language_snippets';
import {
  GENERATE_VECTORS_INGEST,
  GENERATE_VECTORS_SEARCH,
  GENERATE_VECTORS_SEARCH_HYBRID,
  HAVE_VECTORS_INGEST,
  HAVE_VECTORS_SEARCH,
  HAVE_VECTORS_SEARCH_HYBRID,
} from './console_snippets';

const docsLabel = i18n.translate('vectordbOnboarding.docsLabel', {
  defaultMessage: 'View documentation',
});

export const getStepContent = (docLinks: DocLinksStart) => {
  const { enterpriseSearch, serverlessSearch } = docLinks.links;

  return {
    generate: {
      ingest: {
        title: i18n.translate('vectordbOnboarding.generate.ingest.title', {
          defaultMessage: 'Generate embeddings from your content',
        }),
        description: i18n.translate('vectordbOnboarding.generate.ingest.description', {
          defaultMessage:
            'Run this sample script to ingest your data and generate embeddings using Jina models with no extra configuration.',
        }),
        api: {
          consoleComment: i18n.translate('vectordbOnboarding.generate.ingest.consoleComment', {
            defaultMessage: 'Vector DB Onboarding: Generate Vectors',
          }),
          tabs: [
            {
              id: 'ingest',
              label: i18n.translate('vectordbOnboarding.generate.ingest.tabs.ingest', {
                defaultMessage: 'Ingest',
              }),
              snippets: GENERATE_VECTORS_INGEST_SNIPPETS,
              consoleRequest: GENERATE_VECTORS_INGEST,
            },
          ],
        },
        pills: [
          {
            id: 'freeTrialEmbeddings',
            label: i18n.translate('vectordbOnboarding.generate.ingest.pills.freeTrial.label', {
              defaultMessage: 'Free trial embeddings',
            }),
            content: i18n.translate('vectordbOnboarding.generate.ingest.pills.freeTrial.content', {
              defaultMessage:
                "Your trial includes up to 30,000 embedding requests or 100 million tokens, whichever comes first. You'll only be billed once you're on a paid plan.",
            }),
          },
          {
            id: 'jinaModels',
            label: i18n.translate('vectordbOnboarding.generate.ingest.pills.jina.label', {
              defaultMessage: 'Jina embedding models',
            }),
            content: (
              <>
                <FormattedMessage
                  id="vectordbOnboarding.generate.ingest.pills.jina.content"
                  defaultMessage="The default model is {model}, integrated into Elasticsearch's inference pipeline."
                  values={{
                    model: <EuiCode transparentBackground={true}>jina-embedding-v3</EuiCode>,
                  }}
                />
                <EuiHorizontalRule margin="s" />
                <EuiLink href={enterpriseSearch.jinaEmbeddingModels} external target="_blank">
                  {i18n.translate('vectordbOnboarding.generate.ingest.pills.jina.link', {
                    defaultMessage: 'View Jina models',
                  })}
                </EuiLink>
              </>
            ),
          },
          {
            id: 'semanticTextField',
            label: i18n.translate('vectordbOnboarding.generate.ingest.pills.semanticText.label', {
              defaultMessage: 'What is a semantic_text field?',
            }),
            content: (
              <FormattedMessage
                id="vectordbOnboarding.generate.ingest.pills.semanticText.content"
                defaultMessage="The {semanticText} field type handles embedding generation, storage, and chunking automatically. No manual setup required."
                values={{
                  semanticText: <EuiCode transparentBackground={true}>semantic_text</EuiCode>,
                }}
              />
            ),
          },
        ],
        docsPanel: [
          {
            id: 'setUpSemanticText',
            title: i18n.translate('vectordbOnboarding.generate.ingest.docsPanel.setUp.title', {
              defaultMessage: 'Set up and configure semantic_text fields',
            }),
            description: (
              <FormattedMessage
                id="vectordbOnboarding.generate.ingest.docsPanel.setUp.description"
                defaultMessage="The {semanticText} field type automatically generates embeddings using built-in Jina models. No additional configuration or external inference services required."
                values={{
                  semanticText: <EuiCode transparentBackground={true}>semantic_text</EuiCode>,
                }}
              />
            ),
            docsLabel,
            docsHref: enterpriseSearch.semanticTextFieldSetupConfiguration,
          },
          {
            id: 'ingestForSearch',
            title: i18n.translate('vectordbOnboarding.generate.ingest.docsPanel.ingest.title', {
              defaultMessage: 'Ingest for search use cases',
            }),
            description: i18n.translate(
              'vectordbOnboarding.generate.ingest.docsPanel.ingest.description',
              {
                defaultMessage:
                  'Your choice of ingestion method depends on where your content lives and how you need to access it. Explore the methods for ingesting data into Elasticsearch.',
              }
            ),
            docsLabel,
            docsHref: serverlessSearch.gettingStartedIngest,
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
          tabs: [
            {
              id: 'semantic',
              label: i18n.translate('vectordbOnboarding.generate.search.tabs.semantic', {
                defaultMessage: 'Semantic',
              }),
              snippets: GENERATE_VECTORS_SEARCH_SNIPPETS,
              consoleRequest: GENERATE_VECTORS_SEARCH,
            },
            {
              id: 'hybrid',
              label: i18n.translate('vectordbOnboarding.generate.search.tabs.hybrid', {
                defaultMessage: 'Hybrid',
              }),
              snippets: GENERATE_VECTORS_SEARCH_HYBRID_SNIPPETS,
              consoleRequest: GENERATE_VECTORS_SEARCH_HYBRID,
            },
          ],
        },
        pills: [
          {
            id: 'semanticSearch',
            label: i18n.translate('vectordbOnboarding.generate.search.pills.semantic.label', {
              defaultMessage: 'What is semantic search?',
            }),
            content: i18n.translate('vectordbOnboarding.generate.search.pills.semantic.content', {
              defaultMessage:
                'You query your data by asking a question in plain language. Results are ranked by meaning, not just matching words.',
            }),
          },
          {
            id: 'hybridSearch',
            label: i18n.translate('vectordbOnboarding.generate.search.pills.hybrid.label', {
              defaultMessage: 'What is hybrid search?',
            }),
            content: i18n.translate('vectordbOnboarding.generate.search.pills.hybrid.content', {
              defaultMessage:
                'Combine semantic and keyword search in a single query to get the precision of exact matches with the relevance of meaning-based search.',
            }),
          },
        ],
        docsPanel: [
          {
            id: 'searchSemanticText',
            title: i18n.translate('vectordbOnboarding.generate.search.docsPanel.retrieve.title', {
              defaultMessage: 'Search and retrieve semantic_text fields',
            }),
            description: i18n.translate(
              'vectordbOnboarding.generate.search.docsPanel.retrieve.description',
              {
                defaultMessage:
                  'Learn how to query semantic_text fields, retrieve indexed chunks, retrieve field embeddings, and highlight the most relevant fragments from search results.',
              }
            ),
            docsLabel,
            docsHref: enterpriseSearch.semanticTextSearchRetrieval,
          },
          {
            id: 'hybridSearchSemanticText',
            title: i18n.translate('vectordbOnboarding.generate.search.docsPanel.hybrid.title', {
              defaultMessage: 'Hybrid search with semantic_text',
            }),
            description: i18n.translate(
              'vectordbOnboarding.generate.search.docsPanel.hybrid.description',
              {
                defaultMessage:
                  'In hybrid search, semantic retrieval scores by meaning while lexical search scores by textual similarity. Combining them often results in more robust rankings than either alone.',
              }
            ),
            docsLabel,
            docsHref: enterpriseSearch.hybridSemanticText,
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
          tabs: [
            {
              id: 'ingest',
              label: i18n.translate('vectordbOnboarding.haveVectors.ingest.tabs.ingest', {
                defaultMessage: 'Ingest',
              }),
              snippets: HAVE_VECTORS_INGEST_SNIPPETS,
              consoleRequest: HAVE_VECTORS_INGEST,
            },
          ],
        },
        pills: [
          {
            id: 'storageOptimization',
            label: i18n.translate('vectordbOnboarding.haveVectors.ingest.pills.storage.label', {
              defaultMessage: 'Storage optimization settings',
            }),
            content: i18n.translate('vectordbOnboarding.haveVectors.ingest.pills.storage.content', {
              defaultMessage:
                'Elasticsearch uses an index mode optimized for vector search use cases. It applies settings and defaults tuned for indexing, merging, and searching dense vector data.',
            }),
          },
        ],
        docsPanel: [
          {
            id: 'denseVectorSearch',
            title: i18n.translate('vectordbOnboarding.haveVectors.ingest.docsPanel.dense.title', {
              defaultMessage: 'Dense vector search in Elasticsearch',
            }),
            description: i18n.translate(
              'vectordbOnboarding.haveVectors.ingest.docsPanel.dense.description',
              {
                defaultMessage:
                  'Dense vectors use neural embeddings to represent semantic meaning. They translate text, images, or other data into fixed-length vectors of floating-point numbers.',
              }
            ),
            docsLabel,
            docsHref: enterpriseSearch.vectorSearchDenseVector,
          },
          {
            id: 'bringYourOwnDenseVectors',
            title: i18n.translate('vectordbOnboarding.haveVectors.ingest.docsPanel.byo.title', {
              defaultMessage: 'Bring your own dense vectors to Elasticsearch',
            }),
            description: i18n.translate(
              'vectordbOnboarding.haveVectors.ingest.docsPanel.byo.description',
              {
                defaultMessage:
                  'Elasticsearch enables you to store and search mathematical representations of your content - embeddings or vectors - which power AI-driven relevance.',
              }
            ),
            docsLabel,
            docsHref: enterpriseSearch.vectorSearchBringOwnVectors,
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
          tabs: [
            {
              id: 'knn',
              label: i18n.translate('vectordbOnboarding.haveVectors.search.tabs.knn', {
                defaultMessage: 'kNN',
              }),
              snippets: HAVE_VECTORS_SEARCH_SNIPPETS,
              consoleRequest: HAVE_VECTORS_SEARCH,
            },
            {
              id: 'hybrid',
              label: i18n.translate('vectordbOnboarding.haveVectors.search.tabs.hybrid', {
                defaultMessage: 'Hybrid',
              }),
              snippets: HAVE_VECTORS_SEARCH_HYBRID_SNIPPETS,
              consoleRequest: HAVE_VECTORS_SEARCH_HYBRID,
            },
          ],
        },
        pills: [
          {
            id: 'knnSearch',
            label: i18n.translate('vectordbOnboarding.haveVectors.search.pills.knn.label', {
              defaultMessage: 'What is kNN search?',
            }),
            content: i18n.translate('vectordbOnboarding.haveVectors.search.pills.knn.content', {
              defaultMessage:
                'Finds the k closest matches to your query by comparing vector similarity.',
            }),
          },
          {
            id: 'whyKnn',
            label: i18n.translate('vectordbOnboarding.haveVectors.search.pills.whyKnn.label', {
              defaultMessage: 'Why kNN?',
            }),
            content: i18n.translate('vectordbOnboarding.haveVectors.search.pills.whyKnn.content', {
              defaultMessage:
                'Your query becomes a vector and Elasticsearch finds its nearest neighbors in vector space that represent content with the closest meaning.',
            }),
          },
        ],
        docsPanel: [
          {
            id: 'knnSearchElasticsearch',
            title: i18n.translate('vectordbOnboarding.haveVectors.search.docsPanel.knn.title', {
              defaultMessage: 'kNN search in Elasticsearch',
            }),
            description: i18n.translate(
              'vectordbOnboarding.haveVectors.search.docsPanel.knn.description',
              {
                defaultMessage:
                  'Finds the k nearest vectors to a query vector, as measured by a similarity metric. knn query finds nearest vectors through approximate search on indexed dense_vectors or semantic_text fields which use dense_vector under the hood.',
              }
            ),
            docsLabel,
            docsHref: enterpriseSearch.knnSearch,
          },
        ],
      },
    },
  };
};
