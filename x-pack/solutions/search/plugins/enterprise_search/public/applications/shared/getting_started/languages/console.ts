/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LanguageDefinition } from '@kbn/search-api-panels';

import { INDEX_NAME_PLACEHOLDER } from './constants';

import { ingestKeysToJSON } from './helpers';

export const consoleDefinition: Partial<LanguageDefinition> = {
  buildSearchQuery: ({ indexName = INDEX_NAME_PLACEHOLDER }) => `POST /${
    indexName ?? 'books'
  }/_search?pretty
  {
    "query": {
      "query_string": {
        "query": "snow"
      }
    }
  }`,
  ingestData: ({
    indexName = INDEX_NAME_PLACEHOLDER,
    ingestPipeline,
    extraIngestDocumentValues,
  }) => {
    const ingestDocumentKeys = ingestPipeline ? ingestKeysToJSON(extraIngestDocumentValues) : '';
    return `POST _bulk?pretty${ingestPipeline ? `&pipeline=${ingestPipeline}` : ''}
    { "index" : { "_index" : "${indexName}" } }
    {"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470${ingestDocumentKeys}}
    { "index" : { "_index" : "${indexName}" } }
    {"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585${ingestDocumentKeys}}
    { "index" : { "_index" : "${indexName}" } }
    {"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328${ingestDocumentKeys}}
    { "index" : { "_index" : "${indexName}" } }
    {"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227${ingestDocumentKeys}}
    { "index" : { "_index" : "${indexName}" } }
    {"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268${ingestDocumentKeys}}
    { "index" : { "_index" : "${indexName}" } }
    {"name": "The Handmaid's Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311${ingestDocumentKeys}}`;
  },
};
