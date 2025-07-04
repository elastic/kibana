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

import { ingestKeysToRuby } from './helpers';

export const rubyDefinition: LanguageDefinition = {
  buildSearchQuery: ({ indexName = INDEX_NAME_PLACEHOLDER }) =>
    `client.search(index: '${indexName}', q: 'snow')`,
  configureClient: ({ url, apiKey, cloudId }) => `client = Elasticsearch::Client.new(
  api_key: '${apiKey}',
  ${cloudId ? `cloud_id: ${cloudId},` : `url: '${url}',`}
)
`,
  docLink: docLinks.clientsRubyOverview,
  github: {
    label: i18n.translate('xpack.enterpriseSearch.languages.ruby.githubLink', {
      defaultMessage: 'elasticsearch-ruby',
    }),
    link: 'https://github.com/elastic/elasticsearch-ruby',
  },
  iconType: 'ruby.svg',
  id: Languages.RUBY,
  ingestData: ({
    indexName = INDEX_NAME_PLACEHOLDER,
    ingestPipeline,
    extraIngestDocumentValues,
  }) => {
    const ingestDocumentKeys = ingestPipeline ? ingestKeysToRuby(extraIngestDocumentValues) : '';
    return `documents = [
  { index: { _index: '${indexName}', data: {name: "Snow Crash", author: "Neal Stephenson", release_date: "1992-06-01", page_count: 470${ingestDocumentKeys}} } },
  { index: { _index: '${indexName}', data: {name: "Revelation Space", author: "Alastair Reynolds", release_date: "2000-03-15", page_count: 585${ingestDocumentKeys}} } },
  { index: { _index: '${indexName}', data: {name: "1984", author: "George Orwell", release_date: "1985-06-01", page_count: 328${ingestDocumentKeys}} } },
  { index: { _index: '${indexName}', data: {name: "Fahrenheit 451", author: "Ray Bradbury", release_date: "1953-10-15", page_count: 227${ingestDocumentKeys}} } },
  { index: { _index: '${indexName}', data: {name: "Brave New World", author: "Aldous Huxley", release_date: "1932-06-01", page_count: 268${ingestDocumentKeys}} } },
  { index: { _index: '${indexName}', data: {name: "The Handmaid's Tale", author: "Margaret Atwood", release_date: "1985-06-01", page_count: 311${ingestDocumentKeys}} } }
]
client.bulk(body: documents${ingestPipeline ? `, pipeline: "${ingestPipeline}"` : ''})`;
  },
  ingestDataIndex: '',
  installClient: `$ gem install elasticsearch`,
  name: i18n.translate('xpack.enterpriseSearch.languages.ruby', {
    defaultMessage: 'Ruby',
  }),
  testConnection: `# API Key should have cluster monitoring rights.
client.info`,
};
