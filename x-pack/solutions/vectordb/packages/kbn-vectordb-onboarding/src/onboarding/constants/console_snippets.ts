/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const URL_PLACEHOLDER = 'https://your-elasticsearch-url';
export const API_KEY_PLACEHOLDER = 'YOUR_API_KEY';

export const fillPlaceholders = (snippet: string, url?: string, apiKey?: string): string => {
  let result = snippet;
  if (url) result = result.replaceAll(URL_PLACEHOLDER, url);
  if (apiKey) result = result.replaceAll(API_KEY_PLACEHOLDER, apiKey);
  return result;
};

export const HAVE_VECTORS_INGEST = `# Create an index with a dense_vector field
PUT my_dense_vectors
{
  "mappings": {
    "properties": {
      "vector": {
        "type": "dense_vector"
      },
      "text": { "type": "text" }
    }
  }
}

# Index a document with your pre-computed embedding
POST my_dense_vectors/_doc
{
  "text": "Elasticsearch is a distributed search and analytics engine.",
  "vector": [0.12, -0.04, 0.88, 0.21, 0.55]
}`;

export const HAVE_VECTORS_SEARCH = `# Run a kNN search with your query vector
POST my_dense_vectors/_search
{
  "knn": {
    "field": "vector",
    "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60]
  }
}`;

export const HAVE_VECTORS_SEARCH_HYBRID = `# Run a hybrid search combining kNN and lexical matches
POST my_dense_vectors/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "knn": {
            "field": "vector",
            "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60]
          }
        },
        {
          "standard": {
            "query": {
              "match": { "text": "What is Elasticsearch?" }
            }
          }
        }
      ]
    }
  }
}`;

export const GENERATE_VECTORS_INGEST = `# Create an index that generates vectors automatically
PUT my_semantic_vectors
{
  "mappings": {
    "properties": {
      "text": { "type": "semantic_text" }
    }
  }
}

# Bulk index documents — Elasticsearch generates the embedding for you
POST /_bulk?pretty
{ "index": { "_index": "my_semantic_vectors" } }
{"text":"Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano."}
{ "index": { "_index": "my_semantic_vectors" } }
{"text":"Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees."}
{ "index": { "_index": "my_semantic_vectors" } }
{"text":"Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing."}`;

export const GENERATE_VECTORS_SEARCH = `# Run a semantic search using natural language
GET my_semantic_vectors/_search
{
  "query": {
    "match": {
      "text": "Where is best for backpacking?"
    }
  }
}`;

export const GENERATE_VECTORS_SEARCH_HYBRID = `# Run a hybrid search combining semantic and lexical matches
POST my_semantic_vectors/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "semantic": {
                "field": "text",
                "query": "Where is best for backpacking?"
              }
            }
          }
        },
        {
          "standard": {
            "query": {
              "match": { "text": "Where is best for backpacking?" }
            }
          }
        }
      ]
    }
  }
}`;
