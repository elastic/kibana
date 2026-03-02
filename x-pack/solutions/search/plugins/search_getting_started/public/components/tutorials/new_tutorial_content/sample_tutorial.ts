/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TutorialDefinition,
  TutorialStep,
  CleanupItem,
} from '../../../hooks/use_tutorial_content';
import { sampleBookCatalogData } from './sample_data_sets';

const sampleTutorialSteps: TutorialStep[] = [
  {
    id: 'create_index',
    type: 'apiCall',
    header: '## Step 1: Create an index',
    description:
      'Create a new index with mappings for a book catalog. This sets up the schema that defines how your data is stored and searched.',
    apiSnippet: `PUT /book_catalog
{
  "mappings": {
    "properties": {
      "title": { "type": "text" },
      "author": { "type": "text" },
      "genre": { "type": "keyword" },
      "publish_year": { "type": "integer" },
      "description": { "type": "text" }
    }
  }
}`,
    valuesToInsert: [],
    valuesToSave: {
      index_name: 'index',
    },
    apiSnippetHighlights: ['mappings.properties'],
    explanation:
      'The index `{{index_name}}` has been created. Elasticsearch acknowledged the request and the index is ready to receive documents.',
  },
  {
    id: 'index_documents',
    type: 'ingestData',
    header: '## Step 2: Index sample documents',
    description:
      'Add documents to the `{{index_name}}` index using the bulk API. Each document in the sample dataset has the following shape:',
    apiSnippet: `POST /{{index_name}}/_bulk
{
  "title": "Snow Crash",
  "author": "Neal Stephenson",
  "genre": "sci-fi",
  "publish_year": 1992,
  "description": "A pizza deliverer in a dystopian future..."
}`,
    valuesToInsert: ['index_name'],
    valuesToSave: {
      docs_indexed: 'items.length',
    },
    explanation:
      '{{docs_indexed}} documents were indexed into `{{index_name}}`. Each document was assigned an auto-generated `_id`.',
  },
  {
    id: 'full_text_search',
    type: 'apiCall',
    header: '## Step 3: Run a full-text search',
    description:
      'Search across the `{{index_name}}` index using a multi-match query. This searches the `title` and `description` fields for the given text.',
    apiSnippet: `GET /{{index_name}}/_search
{
  "query": {
    "multi_match": {
      "query": "dystopian future",
      "fields": ["title", "description"]
    }
  }
}`,
    valuesToInsert: ['index_name'],
    valuesToSave: {
      total_hits: 'hits.total.value',
      top_hit_title: 'hits.hits[0]._source.title',
      top_hit_score: 'hits.hits[0]._score',
    },
    apiSnippetHighlights: ['query.multi_match'],
    explanation:
      'The search returned **{{total_hits}}** results. The top hit was "{{top_hit_title}}" with a relevance score of `{{top_hit_score}}`. Elasticsearch ranked it highest because the `description` field closely matched "dystopian future".',
  },
  {
    id: 'filtered_search',
    type: 'apiCall',
    header: '## Step 4: Add a filter',
    description:
      'Combine a full-text query with a filter to narrow results. Filters on `keyword` fields like `genre` are fast because they skip relevance scoring.',
    apiSnippet: `GET /{{index_name}}/_search
{
  "query": {
    "bool": {
      "must": {
        "multi_match": {
          "query": "young",
          "fields": ["title", "description"]
        }
      },
      "filter": {
        "term": { "genre": "sci-fi" }
      }
    }
  }
}`,
    valuesToInsert: ['index_name'],
    valuesToSave: {
      filtered_hits: 'hits.total.value',
      filtered_top_title: 'hits.hits[0]._source.title',
    },
    apiSnippetHighlights: ['query.bool'],
    explanation:
      'With the `genre: sci-fi` filter applied, the search returned **{{filtered_hits}}** results. The top result is "{{filtered_top_title}}". The filter excluded non-sci-fi books before scoring, making the query both faster and more precise.',
  },
  {
    id: 'aggregation',
    type: 'apiCall',
    header: '## Step 5: Aggregate your data',
    description:
      'Run an aggregation to get a breakdown of documents by `genre`. Aggregations let you compute summaries over your data alongside search results.',
    apiSnippet: `GET /{{index_name}}/_search
{
  "size": 0,
  "aggs": {
    "genres": {
      "terms": { "field": "genre" }
    }
  }
}`,
    valuesToInsert: ['index_name'],
    valuesToSave: {
      top_genre: 'aggregations.genres.buckets[0].key',
      top_genre_count: 'aggregations.genres.buckets[0].doc_count',
    },
    apiSnippetHighlights: ['aggs.genres'],
    explanation:
      'The most common genre is **{{top_genre}}** with {{top_genre_count}} documents. Aggregations are a powerful way to build faceted navigation, dashboards, and analytics on top of your search data.',
  },
];

const sampleTutorialCleanup: CleanupItem[] = [
  { label: 'Index: book_catalog', apiSnippet: 'DELETE /book_catalog' },
];

export const sampleTutorial: TutorialDefinition = {
  slug: 'sample-tutorial',
  title: 'Search basics',
  description:
    'Learn how to create an index, add documents, run full-text searches, apply filters, and use aggregations.',
  globalVariables: {
    index_name: 'book_catalog',
  },
  sampleData: sampleBookCatalogData,
  summary: {
    text: 'You created an index, indexed documents with the bulk API, ran full-text and filtered queries, and computed aggregations. These are the building blocks for any search experience on Elasticsearch.',
    links: [
      {
        label: 'Search your data',
        href: 'https://www.elastic.co/docs/solutions/search',
      },
      {
        label: 'Query DSL reference',
        href: 'https://www.elastic.co/docs/explore-analyze/query-filter/languages/querydsl',
      },
      {
        label: 'Aggregations guide',
        href: 'https://www.elastic.co/docs/explore-analyze/query-filter/aggregations',
      },
    ],
  },
  steps: sampleTutorialSteps,
  cleanup: sampleTutorialCleanup,
};
