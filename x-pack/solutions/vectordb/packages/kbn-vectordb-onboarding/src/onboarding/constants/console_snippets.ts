/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const URL_PLACEHOLDER = 'https://your-elasticsearch-url';
export const API_KEY_PLACEHOLDER = 'YOUR_API_KEY';

export const HAVE_VECTORS_INGEST_CONSOLE_SNIPPET = `# Create an index with a dense_vector field
PUT my_dense_vectors
{
  "mappings": {
    "properties": {
      "vector": { "type": "dense_vector" },
      "text": { "type": "text" }
    }
  }
}

# Index documents with your pre-computed embeddings
POST my_dense_vectors/_bulk
{ "index": {} }
{ "text": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.", "vector": [0.12, -0.04, 0.88, 0.21, 0.55] }
{ "index": {} }
{ "text": "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.", "vector": [0.4, 0.5, 0.82, -0.3, -0.1] }
{ "index": {} }
{ "text": "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.", "vector": [0.2, 0.18, 0.32, -0.5, -0.01] }`;

export const HAVE_VECTORS_SEARCH_CONSOLE_SNIPPET = `# Run a kNN search with your query vector
POST my_dense_vectors/_search
{
  "knn": {
    "field": "vector",
    "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60]
  }
}`;

export const HAVE_VECTORS_SEARCH_HYBRID_CONSOLE_SNIPPET = `# Run a hybrid search combining kNN and lexical matches
POST my_dense_vectors/_search
{
  "retriever": {
    "linear": {
      "retrievers": [
        {
          "retriever": {
            "knn": {
              "field": "vector",
              "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60],
              "k": 10
            }
          },
          "normalizer": "minmax"
        },
        {
          "retriever": {
            "standard": {
              "query": {
                "match": { "text": "What is a good national park for backpacking?" }
              }
            }
          },
          "normalizer": "minmax"
        }
      ]
    }
  }
}`;

export const GENERATE_VECTORS_INGEST_CONSOLE_SNIPPET = `# Create an index that generates vectors automatically
PUT my_semantic_vectors
{
  "mappings": {
    "properties": {
      "content": { "type": "text", "copy_to": "semantic_content" },
      "semantic_content": { "type": "semantic_text" }
    }
  }
}

# Index documents — Elasticsearch generates the embeddings for you
POST my_semantic_vectors/_bulk
{ "index": {} }
{ "content": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano." }
{ "index": {} }
{ "content": "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees." }
{ "index": {} }
{ "content": "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing." }`;

export const GENERATE_VECTORS_SEARCH_CONSOLE_SNIPPET = `# Run a semantic search using natural language
POST my_semantic_vectors/_search
{
  "query": {
    "match": { "semantic_content": "What is a good national park for backpacking?" }
  }
}`;

export const GENERATE_VECTORS_SEARCH_HYBRID_CONSOLE_SNIPPET = `# Run a hybrid search combining semantic and lexical matches
POST my_semantic_vectors/_search
{
  "retriever": {
    "linear": {
      "query": "What is a good national park for backpacking?",
      "fields": ["content", "semantic_content"],
      "normalizer": "minmax"
    }
  }
}`;
