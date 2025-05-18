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

export const goDefinition: LanguageDefinition = {
  buildSearchQuery: ({ indexName = INDEX_NAME_PLACEHOLDER }) => `searchResp, err := es.Search(
  es.Search.WithContext(context.Background()),
  es.Search.WithIndex("${indexName}"),
  es.Search.WithQuery("snow"),
  es.Search.WithTrackTotalHits(true),
  es.Search.WithPretty(),
)

fmt.Println(searchResp, err)`,
  configureClient: ({ url, apiKey, cloudId }) => `import (
  "bytes"
  "context"
  "fmt"
  "log"

  "github.com/elastic/go-elasticsearch/v8"
)

// ...

cfg := elasticsearch.Config{
  ${
    cloudId
      ? `CloudID:"${cloudId}",`
      : `Addresses: []string{
    "${url}",
  },`
  }
  APIKey: "${apiKey}",
}

es, err := elasticsearch.NewClient(cfg)
if err != nil {
  log.Fatalf("Error creating the client: %s", err)
}
`,
  docLink: docLinks.clientsGoIndex,
  github: {
    label: i18n.translate('xpack.enterpriseSearch.languages.go.githubLink', {
      defaultMessage: 'go-elasticsearch',
    }),
    link: 'https://github.com/elastic/go-elasticsearch',
  },
  iconType: 'go.svg',
  id: Languages.GO,
  ingestData: ({
    indexName = INDEX_NAME_PLACEHOLDER,
    ingestPipeline,
    extraIngestDocumentValues,
  }) => {
    const ingestDocumentKeys = ingestPipeline ? ingestKeysToJSON(extraIngestDocumentValues) : '';
    return `buf := bytes.NewBufferString(\`
{"index":{"_id":"9780553351927"}}
{"name":"Snow Crash","author":"Neal Stephenson","release_date":"1992-06-01","page_count": 470${ingestDocumentKeys}}
{ "index": { "_id": "9780441017225"}}
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585${ingestDocumentKeys}}
{ "index": { "_id": "9780451524935"}}
{"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328${ingestDocumentKeys}}
{ "index": { "_id": "9781451673319"}}
{"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227${ingestDocumentKeys}}
{ "index": { "_id": "9780060850524"}}
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268${ingestDocumentKeys}}
{ "index": { "_id": "9780385490818"}}
{"name": "The Handmaid's Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311${ingestDocumentKeys}}
\`)

ingestResult, err := es.Bulk(
  bytes.NewReader(buf.Bytes()),
  es.Bulk.WithIndex("${indexName}"),${
      ingestPipeline ? `\n  es.Bulk.WithPipeline("${ingestPipeline}"),` : ''
    }
)

fmt.Println(ingestResult, err)`;
  },
  ingestDataIndex: '',
  installClient: 'go get github.com/elastic/go-elasticsearch/v8@latest',
  name: i18n.translate('xpack.enterpriseSearch.languages.go', {
    defaultMessage: 'Go',
  }),
  testConnection: `// API Key should have cluster monitoring rights
infores, err := es.Info()
if err != nil {
  log.Fatalf("Error getting response: %s", err)
}

fmt.Println(infores)`,
};
