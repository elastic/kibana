/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Languages, LanguageDefinition } from '@kbn/search-api-panels';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../../common/doc_links';

export const curlDefinition: LanguageDefinition = {
  buildSearchQuery: `curl -X POST "\$\{ES_URL\}/books/_search?pretty" \\
  -H "Authorization: ApiKey "\$\{API_KEY\}"" \\
  -H "Content-Type: application/json" \\
  -d'
{
  "query": {
    "query_string": {
      "query": "snow"
    }
  }
}'`,
  configureClient: ({ apiKey, url }) => `export ES_URL="${url}"
export API_KEY="${apiKey}"`,
  docLink: docLinks.apiIntro,
  github: {
    link: 'https://github.com/curl/curl',
    label: i18n.translate('xpack.serverlessSearch.languages.cURL.githubLabel', {
      defaultMessage: 'curl',
    }),
  },
  iconType: 'curl.svg',
  id: Languages.CURL,
  ingestData: ({ ingestPipeline }) => `curl -X POST "\$\{ES_URL\}/_bulk?pretty${
    ingestPipeline ? `&pipeline=${ingestPipeline}` : ''
  }" \\
  -H "Authorization: ApiKey "\$\{API_KEY\}"" \\
  -H "Content-Type: application/json" \\
  -d'
{ "index" : { "_index" : "books" } }
{"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470}
{ "index" : { "_index" : "books" } }
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585}
{ "index" : { "_index" : "books" } }
{"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328}
{ "index" : { "_index" : "books" } }
{"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227}
{ "index" : { "_index" : "books" } }
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268}
{ "index" : { "_index" : "books" } }
{"name": "The Handmaid'"'"'s Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311}
'`,
  ingestDataIndex: ({
    apiKey,
    indexName,
    ingestPipeline,
  }) => `curl -X POST "\$\{url\}/_bulk?pretty${
    ingestPipeline ? `&pipeline=${ingestPipeline}` : ''
  }" \\
  -H "Authorization: ApiKey ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d'
{ "index" : { "_index" : "${indexName ?? 'index_name'}" } }
{"name": "foo", "title": "bar" }
'`,
  installClient: `# if cURL is not already installed on your system
# then install it with the package manager of your choice

# example
brew install curl`,
  name: i18n.translate('xpack.serverlessSearch.languages.cURL', {
    defaultMessage: 'cURL',
  }),
  languageStyling: 'shell',
  testConnection: `curl "\$\{ES_URL\}" \\
  -H "Authorization: ApiKey "\$\{API_KEY\}"" \\
  -H "Content-Type: application/json"`,
};
