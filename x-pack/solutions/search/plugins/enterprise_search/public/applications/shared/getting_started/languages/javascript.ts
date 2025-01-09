/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Languages, LanguageDefinition } from '@kbn/search-api-panels';

import { docLinks } from '../../doc_links';

import { INDEX_NAME_PLACEHOLDER } from './constants';

import { ingestKeysToJSON } from './helpers';

export const javascriptDefinition: LanguageDefinition = {
  buildSearchQuery: ({ indexName = INDEX_NAME_PLACEHOLDER }) => `// Let's search!
const searchResult = await client.search({
  index: '${indexName}',
  q: 'snow'
});

console.log(searchResult.hits.hits)
`,
  configureClient: ({ url, apiKey }) => `const { Client } = require('@elastic/elasticsearch');
const client = new Client({
  node: '${url}',
  auth: {
      apiKey: '${apiKey}'
  }
});`,
  docLink: docLinks.clientsJsIntro,
  github: {
    label: i18n.translate('xpack.enterpriseSearch.languages.javascript.githubLink', {
      defaultMessage: 'elasticsearch',
    }),
    link: 'https://github.com/elastic/elasticsearch-js',
  },
  iconType: 'javascript.svg',
  id: Languages.JAVASCRIPT,
  ingestData: ({
    indexName = INDEX_NAME_PLACEHOLDER,
    ingestPipeline,
    extraIngestDocumentValues,
  }) => {
    const ingestDocumentKeys = ingestPipeline ? ingestKeysToJSON(extraIngestDocumentValues) : '';
    return `// Sample data books
const dataset = [
  {"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470${ingestDocumentKeys}},
  {"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585${ingestDocumentKeys}},
  {"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328${ingestDocumentKeys}},
  {"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227${ingestDocumentKeys}},
  {"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268${ingestDocumentKeys}},
  {"name": "The Handmaid's Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311${ingestDocumentKeys}},
];

// Index with the bulk helper
const result = await client.helpers.bulk({
  datasource: dataset,${ingestPipeline ? `\n  pipeline: "${ingestPipeline}",` : ''}
  onDocument: (doc) => ({ index: { _index: '${indexName}' }}),
});

console.log(result);
/**
{
  total: 6,
  failed: 0,
  retry: 0,
  successful: 6,
  noop: 0,
  time: 82,
  bytes: 1273,
  aborted: false
}
*/`;
  },
  ingestDataIndex: '',
  installClient: 'npm install @elastic/elasticsearch@8',
  name: i18n.translate('xpack.enterpriseSearch.languages.javascript', {
    defaultMessage: 'JavaScript',
  }),
  testConnection: `// API Key should have cluster monitor rights.
const resp = await client.info();

console.log(resp);
/**
{
  name: 'instance-0000000000',
  cluster_name: 'd9dcd35d12fe46dfaa28ec813f65d57b',
  cluster_uuid: 'iln8jaivThSezhTkzp0Knw',
  version: {
    build_flavor: 'default',
    build_type: 'docker',
    build_hash: 'ca3dc3a882d76f14d2765906ce3b1cf421948d19',
    build_date: '2023-08-28T11:24:16.383660553Z',
    build_snapshot: true,
    lucene_version: '9.7.0',
    minimum_wire_compatibility_version: '7.17.0',
    minimum_index_compatibility_version: '7.0.0'
  },
  tagline: 'You Know, for Search'
}
*/`,
};
