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
PUT my-vectors
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
POST my-vectors/_doc
{
  "text": "Elasticsearch is a distributed search and analytics engine.",
  "vector": [0.12, -0.04, 0.88, 0.21, 0.55]
}`;

export const HAVE_VECTORS_SEARCH = `# Run a kNN search with your query vector
POST my-vectors/_search
{
  "knn": {
    "field": "vector",
    "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60]
  }
}`;

export const GENERATE_VECTORS_INGEST = `# Create an index that generates vectors automatically
PUT my-vectors
{
  "mappings": {
    "properties": {
      "text": { "type": "semantic_text" }
    }
  }
}

# Index a document — Elasticsearch generates the embedding for you
POST my-vectors/_doc
{
  "text": "Elasticsearch is a distributed search and analytics engine."
}`;

export const GENERATE_VECTORS_SEARCH = `# Run a semantic search using natural language
POST my-vectors/_search
{
  "query": {
    "semantic": {
      "field": "text",
      "query": "what is elasticsearch?"
    }
  }
}`;
