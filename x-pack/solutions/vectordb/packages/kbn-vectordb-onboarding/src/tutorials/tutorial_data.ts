/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DocLinksStart } from '@kbn/core/public';

const ELASTIC_SEARCH_LABS_URL = 'https://www.elastic.co/search-labs/';

const SEARCH_LABS_SENTENCE_TRANSFORMERS_EXAMPLE_URL = `${ELASTIC_SEARCH_LABS_URL}tutorials/examples/semantic-search-sentence-transformers-elasticsearch`;
const SEARCH_LABS_NLP_MODEL_VECTOR_SEARCH_EXAMPLE_URL = `${ELASTIC_SEARCH_LABS_URL}tutorials/examples/nlp-model-vector-search-elasticsearch`;
const SEARCH_LABS_BBQ_PRECONDITIONING_VECTORS_BLOG_URL = `${ELASTIC_SEARCH_LABS_URL}blog/elasticsearch-bbq-preconditioning-vectors`;
const SEARCH_LABS_DISKBBQ_QUERY_QUANTIZATION_BLOG_URL = `${ELASTIC_SEARCH_LABS_URL}blog/diskbbq-asymmetric-query-quantization`;
const SEARCH_LABS_CHATBOT_RAG_APP_EXAMPLE_URL = `${ELASTIC_SEARCH_LABS_URL}tutorials/chatbot-tutorial/welcome`;

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

export const TUTORIAL_TOPICS = {
  documentation: {
    tag: DOCUMENTATION_LABEL,
    filter: DOCUMENTATION_LABEL,
    icon: 'documents',
  },
  article: {
    tag: ARTICLE_LABEL,
    filter: i18n.translate('vectordbOnboarding.tutorials.topic.article.filterLabel', {
      defaultMessage: 'Articles',
    }),
    icon: 'globe',
  },
  notebook: {
    tag: NOTEBOOK_LABEL,
    filter: i18n.translate('vectordbOnboarding.tutorials.topic.notebook.filterLabel', {
      defaultMessage: 'Notebooks',
    }),
    icon: 'training',
  },
};

type TutorialTopicId = keyof typeof TUTORIAL_TOPICS;

export interface TutorialContent {
  id: string;
  title: string;
  description: string;
  topic: TutorialTopicId;
  href: string;
}

export const getTutorialContent = (docLinks: DocLinksStart): TutorialContent[] => [
  {
    id: 'vector-search-documentation',
    topic: 'documentation',
    href: docLinks.links.enterpriseSearch.vectorSearch,
    title: i18n.translate('vectordbOnboarding.tutorials.vectorSearch.title', {
      defaultMessage: 'Vector search in Elasticsearch',
    }),
    description: i18n.translate('vectordbOnboarding.tutorials.vectorSearch.description', {
      defaultMessage:
        'Overview of embeddings for AI-driven search, with field/query types and links to dense and sparse vector approaches.',
    }),
  },
  {
    id: 'bring-your-own-vectors-documentation',
    topic: 'documentation',
    href: docLinks.links.enterpriseSearch.vectorSearchBringOwnVectors,
    title: i18n.translate('vectordbOnboarding.tutorials.bringYourOwnVectors.title', {
      defaultMessage: 'Bring your own vectors',
    }),
    description: i18n.translate('vectordbOnboarding.tutorials.bringYourOwnVectors.description', {
      defaultMessage:
        'Index pre-generated embeddings using dense_vector fields and query them with a kNN retriever.',
    }),
  },
  {
    id: 'semantic-search-overview-documentation',
    topic: 'documentation',
    href: docLinks.links.enterpriseSearch.semanticSearch,
    title: i18n.translate('vectordbOnboarding.tutorials.semanticSearchOverview.title', {
      defaultMessage: 'Semantic search overview',
    }),
    description: i18n.translate('vectordbOnboarding.tutorials.semanticSearchOverview.description', {
      defaultMessage:
        'Compare semantic_text, inference API, and ELSER to pick the right approach for your use case.',
    }),
  },
  {
    id: 'get-started-semantic-search-documentation',
    topic: 'documentation',
    href: docLinks.links.enterpriseSearch.semanticSearchGetStarted,
    title: i18n.translate('vectordbOnboarding.tutorials.getStartedSemanticSearch.title', {
      defaultMessage: 'Get started with semantic search',
    }),
    description: i18n.translate(
      'vectordbOnboarding.tutorials.getStartedSemanticSearch.description',
      {
        defaultMessage:
          'Step-by-step quickstart: create a semantic_text mapping, ingest documents, and run queries with ES|QL.',
      }
    ),
  },
  {
    id: 'semantic-search-sentence-transformers-notebook',
    topic: 'notebook',
    href: SEARCH_LABS_SENTENCE_TRANSFORMERS_EXAMPLE_URL,
    title: i18n.translate('vectordbOnboarding.tutorials.semanticSearchSentenceTransformers.title', {
      defaultMessage: 'Semantic search with sentence transformers',
    }),
    description: i18n.translate(
      'vectordbOnboarding.tutorials.semanticSearchSentenceTransformers.description',
      {
        defaultMessage:
          'Interactive notebook: semantic search with Sentence Transformers, including vector queries and keyword filters.',
      }
    ),
  },
  {
    id: 'chatbot-rag-app-notebook',
    topic: 'notebook',
    href: SEARCH_LABS_CHATBOT_RAG_APP_EXAMPLE_URL,
    title: i18n.translate('vectordbOnboarding.tutorials.chatbotRagApp.title', {
      defaultMessage: 'Build a RAG chatbot tutorial',
    }),
    description: i18n.translate('vectordbOnboarding.tutorials.chatbotRagApp.description', {
      defaultMessage:
        'Step-by-step tutorial for building an LLM chatbot with Retrieval-Augmented Generation (RAG), covering setup, retrieval, generation, and observability.',
    }),
  },
  {
    id: 'load-embedding-model-notebook',
    topic: 'notebook',
    href: SEARCH_LABS_NLP_MODEL_VECTOR_SEARCH_EXAMPLE_URL,
    title: i18n.translate('vectordbOnboarding.tutorials.loadEmbeddingModel.title', {
      defaultMessage: 'Load an embedding model into Elasticsearch',
    }),
    description: i18n.translate('vectordbOnboarding.tutorials.loadEmbeddingModel.description', {
      defaultMessage:
        'Deploy a Hugging Face embedding model with eland and run natural language queries over indexed documents.',
    }),
  },
  {
    id: 'preconditioning-vectors-bbq-article',
    topic: 'article',
    href: SEARCH_LABS_BBQ_PRECONDITIONING_VECTORS_BLOG_URL,
    title: i18n.translate('vectordbOnboarding.tutorials.preconditioningVectorsBbq.title', {
      defaultMessage: 'Preconditioning vectors for BBQ',
    }),
    description: i18n.translate(
      'vectordbOnboarding.tutorials.preconditioningVectorsBbq.description',
      {
        defaultMessage:
          'Fix BBQ recall issues with preconditioning. Benchmarks show up to 74% improvement on real-world datasets.',
      }
    ),
  },
  {
    id: 'diskbbq-filter-search-article',
    topic: 'article',
    href: SEARCH_LABS_DISKBBQ_QUERY_QUANTIZATION_BLOG_URL,
    title: i18n.translate('vectordbOnboarding.tutorials.diskBbqFilterSearch.title', {
      defaultMessage: 'Cutting Elasticsearch DiskBBQ query quantization time by 5x',
    }),
    description: i18n.translate('vectordbOnboarding.tutorials.diskBbqFilterSearch.description', {
      defaultMessage:
        'See how asymmetric quantization cuts DiskBBQ query quantization overhead from about 20% to 4% with little recall impact.',
    }),
  },
];
