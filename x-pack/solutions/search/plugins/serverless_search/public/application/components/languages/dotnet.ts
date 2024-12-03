/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Languages, LanguageDefinition } from '@kbn/search-api-panels';
// import { docLinks } from '../../../../common/doc_links';

export const dotnetDefinition: LanguageDefinition = {
  id: Languages.DOTNET,
  name: i18n.translate('xpack.serverlessSearch.languages.dotnet', { defaultMessage: '.NET' }),
  iconType: 'dotnet.svg',
  github: {
    label: i18n.translate('xpack.serverlessSearch.languages.dotnet.githubLabel', {
      defaultMessage: 'elasticsearch-serverless-net',
    }),
    link: 'https://github.com/elastic/elasticsearch-serverless-net',
  },
  // Code Snippets,
  installClient: 'dotnet add package Elastic.Clients.Elasticsearch.Serverless',
  configureClient: ({ apiKey, cloudId }) => `using System;
using Elastic.Clients.Elasticsearch.Serverless;
using Elastic.Clients.Elasticsearch.Serverless.QueryDsl;

var client = new ElasticsearchClient("${cloudId}", new ApiKey("${apiKey}"));`,
  testConnection: `var info = await client.InfoAsync();`,
  ingestData: ({ ingestPipeline }) => `var doc = new Book
{
  Id = "9780553351927",
  Name = "Snow Crash",
  Author = "Neal Stephenson",
  ReleaseDate = new DateTime(1992, 06, 01),
  PageCount = 470
};

var response = await client.IndexAsync(doc, index: "books"${
    ingestPipeline ? `, x => x.Pipeline("${ingestPipeline}")` : ''
  }));`,
  ingestDataIndex: ({ apiKey, cloudId, indexName, ingestPipeline }) => `using System;
using Elastic.Clients.Elasticsearch.Serverless;
using Elastic.Clients.Elasticsearch.Serverless.QueryDsl;

var client = new ElasticsearchClient("${cloudId}", new ApiKey("${apiKey}"));

var doc = new Book
{
  Id = "9780553351927",
  Name = "Snow Crash",
  Author = "Neal Stephenson",
  ReleaseDate = new DateTime(1992, 06, 01),
  PageCount = 470
};

var response = await client.IndexAsync(doc, index: "${indexName}"${
    ingestPipeline ? `, x => x.Pipeline("${ingestPipeline}")` : ''
  }));`,
  buildSearchQuery: `var response = await client.SearchAsync<Book>(s => s
  .Index("books")
  .From(0)
  .Size(10)
  .Query("snow")
);

if (response.IsValidResponse)
{
    var books = response.Documents.FirstOrDefault();
}`,
};
