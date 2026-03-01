/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TutorialDefinition, TutorialStep } from '../../../hooks/use_tutorial_content';

const semanticTutorialSteps: TutorialStep[] = [
  {
    id: 'create_index',
    header: '## Step 1: Create an index with semantic_text',
    description:
      'Create an index with a `semantic_text` field type. This field automatically generates vector embeddings from your text using an inference model, enabling meaning-based search out of the box.',
    apiSnippet: `PUT /kibana_sample_data_semantic
{
  "mappings": {
    "properties": {
      "text": {
        "type": "semantic_text"
      }
    }
  }
}`,
    valuesToInsert: [],
    valuesToSave: {
      index_name: 'index',
    },
    explanation:
      'The index `{{index_name}}` was created with a `semantic_text` field. By default, this uses the ELSER model to generate embeddings. You can configure a different inference model if needed.',
  },
  {
    id: 'ingest_documents',
    header: '## Step 2: Ingest documents',
    description:
      'Add documents to `{{index_name}}` using the bulk API. During ingestion, the inference model automatically generates vector embeddings for each document.',
    apiSnippet: `POST /_bulk?pretty
{ "index": { "_index": "{{index_name}}" } }
{"text":"Yellowstone National Park is one of the largest national parks in the United States. It ranges from Wyoming to Montana and Idaho, and contains an area of 2,219,791 acres across three different states. Its most famous for hosting the geyser Old Faithful and is centered on the Yellowstone Caldera, the largest super volcano on the American continent. Yellowstone is host to hundreds of species of animal, many of which are endangered or threatened. Most notably, it contains free-ranging herds of bison and elk, alongside bears, cougars and wolves. The national park receives over 4.5 million visitors annually and is a UNESCO World Heritage Site."}
{ "index": { "_index": "{{index_name}}" } }
{"text":"Yosemite National Park is a United States National Park, covering over 750,000 acres of land in California. A UNESCO World Heritage Site, the park is best known for its granite cliffs, waterfalls and giant sequoia trees. Yosemite hosts over four million visitors in most years, with a peak of five million visitors in 2016. The park is home to a diverse range of wildlife, including mule deer, black bears, and the endangered Sierra Nevada bighorn sheep."}
{ "index": { "_index": "{{index_name}}" } }
{"text":"Rocky Mountain National Park is one of the most popular national parks in the United States. It receives over 4.5 million visitors annually, and is known for its mountainous terrain, including Longs Peak, which is the highest peak in the park. The park is home to a variety of wildlife, including elk, mule deer, moose, and bighorn sheep."}`,
    valuesToInsert: ['index_name'],
    valuesToSave: {
      items_count: 'items.length',
    },
    explanation:
      '{{items_count}} documents were indexed into `{{index_name}}`. The inference model generated embeddings for each document during ingestion. If you see errors, wait a moment and retry — the model may still be initializing.',
  },
  {
    id: 'semantic_search',
    header: '## Step 3: Run a semantic search',
    description:
      'Search `{{index_name}}` using a natural language question. Because the `text` field is `semantic_text`, a standard `match` query automatically performs semantic search — ranking results by meaning, not just keyword overlap.',
    apiSnippet: `GET /{{index_name}}/_search
{
  "query": {
    "match": {
      "text": "Which park is most popular?"
    }
  }
}`,
    valuesToInsert: ['index_name'],
    valuesToSave: {
      total_hits: 'hits.total.value',
      top_score: 'hits.hits[0]._score',
    },
    explanation:
      'The query returned **{{total_hits}}** results ranked by semantic relevance. The top result scored `{{top_score}}`. Notice how the query "Which park is most popular?" matched documents discussing visitor counts and popularity — even without those exact words appearing.',
  },
  {
    id: 'filtered_search',
    header: '## Step 4: Combine semantic search with filters',
    description:
      'Use a `bool` query to combine semantic search (in the `must` clause for relevance scoring) with a filter (in the `filter` clause for fast, score-neutral restriction). Results are limited to 2 and sorted by score.',
    apiSnippet: `GET /{{index_name}}/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "text": "Which park has the most wildlife?"
          }
        }
      ],
      "filter": [
        {
          "exists": {
            "field": "text"
          }
        }
      ]
    }
  },
  "size": 2,
  "sort": {
    "_score": "desc"
  }
}`,
    valuesToInsert: ['index_name'],
    valuesToSave: {
      filtered_hits: 'hits.total.value',
      filtered_top_score: 'hits.hits[0]._score',
    },
    explanation:
      'The filtered query returned **{{filtered_hits}}** total matches, limited to 2 results. The `must` clause drives relevance scoring (top score: `{{filtered_top_score}}`), while the `filter` clause restricts results without affecting scores.',
  },
  {
    id: 'min_score_search',
    header: '## Step 5: Use min_score for quality thresholds',
    description:
      'Set a `min_score` threshold to only return documents that meet a minimum relevance bar. Documents scoring below this threshold are excluded entirely.',
    apiSnippet: `GET /{{index_name}}/_search
{
  "min_score": 15.0,
  "query": {
    "match": {
      "text": "Which park is best for hiking?"
    }
  }
}`,
    valuesToInsert: ['index_name'],
    valuesToSave: {
      min_score_hits: 'hits.total.value',
    },
    explanation:
      'With `min_score: 15.0`, only **{{min_score_hits}}** document(s) met the relevance threshold. This is a powerful way to control result quality — only highly relevant documents are returned.',
  },
];

export const semanticTutorial: TutorialDefinition = {
  slug: 'semantic-search',
  title: 'Semantic search',
  description:
    'Build meaning-based search using the semantic_text field type. Search by intent, not just keywords.',
  globalVariables: {
    index_name: 'kibana_sample_data_semantic',
  },
  summary: {
    text: 'You created an index with semantic_text, ingested documents with auto-generated embeddings, ran natural language queries, and applied filters and quality thresholds. Semantic search finds relevant results even when query words do not exactly match document text.',
    links: [
      {
        label: 'Semantic search with semantic_text',
        href: 'https://www.elastic.co/docs/solutions/search/semantic-search/semantic-search-semantic-text',
      },
      {
        label: 'Inference endpoints',
        href: 'https://www.elastic.co/docs/solutions/search/semantic-search/semantic-search-inference',
      },
      {
        label: 'Ingest pipelines for semantic search',
        href: 'https://www.elastic.co/docs/solutions/search/semantic-search/semantic-search-elser-ingest-pipelines',
      },
    ],
  },
  steps: semanticTutorialSteps,
};
