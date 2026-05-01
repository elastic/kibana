/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type VectorPath = 'have-vectors' | 'generate-vectors';

export const URL_PLACEHOLDER = 'https://your-elasticsearch-url';
export const API_KEY_PLACEHOLDER = 'YOUR_API_KEY';

export const fillPlaceholders = (snippet: string, url?: string, apiKey?: string): string =>
  snippet
    .replaceAll(URL_PLACEHOLDER, url || URL_PLACEHOLDER)
    .replaceAll(API_KEY_PLACEHOLDER, apiKey || API_KEY_PLACEHOLDER);

export const HAVE_VECTORS_INGEST = `# Create an index with a dense_vector field
PUT my-vectors
{
  "mappings": {
    "properties": {
      "vector": {
        "type": "dense_vector",
        "dims": 384,
        "similarity": "cosine"
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
    "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60],
    "k": 10,
    "num_candidates": 100
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

export const HAVE_VECTORS_PROMPT = `I have vector embeddings I want to load into an Elasticsearch index, and I want to query them with kNN search.

Write a small program (please ask me which language to use) that:
1. Connects to Elasticsearch using a URL and API key I will provide.
2. Creates an index with this mapping (adjust the dims to match my embedding model):
   {
     "mappings": {
       "properties": {
         "vector": { "type": "dense_vector", "dims": 384, "similarity": "cosine" },
         "text": { "type": "text" }
       }
     }
   }
3. Bulk-ingests documents from a source I describe. Each document has a precomputed embedding (array of floats) and accompanying text.
4. Runs a kNN search to confirm the data is queryable, returning the top 10 results.

Use the official Elasticsearch client for the language. Ask me for: my embedding model and dimensions, the source of the documents, and any metadata fields I want indexed alongside the vector.`;

export const GENERATE_VECTORS_PROMPT = `I have text data I want to load into Elasticsearch, and I want Elasticsearch to generate the vector embeddings for me automatically using the semantic_text field type.

Write a small program (please ask me which language to use) that:
1. Connects to Elasticsearch using a URL and API key I will provide.
2. Creates an index with a semantic_text field:
   {
     "mappings": {
       "properties": {
         "text": { "type": "semantic_text" }
       }
     }
   }
3. Bulk-ingests text documents from a source I describe.
4. Runs a semantic search using a natural-language query and returns the top 10 results.

Use the official Elasticsearch client for the language. Ask me for: the source of the documents, any additional metadata fields I want indexed, and the natural-language query to test with.`;

export const getIngestSnippet = (path: VectorPath): string =>
  path === 'have-vectors' ? HAVE_VECTORS_INGEST : GENERATE_VECTORS_INGEST;

export const getSearchSnippet = (path: VectorPath): string =>
  path === 'have-vectors' ? HAVE_VECTORS_SEARCH : GENERATE_VECTORS_SEARCH;

export const getPrompt = (path: VectorPath): string =>
  path === 'have-vectors' ? HAVE_VECTORS_PROMPT : GENERATE_VECTORS_PROMPT;
