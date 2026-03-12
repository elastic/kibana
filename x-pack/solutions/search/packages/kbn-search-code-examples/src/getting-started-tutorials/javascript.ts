/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { GettingStartedCodeExample } from '.';
import type {
  CodeLanguage,
  GettingStartedCodeDefinition,
  GettingStartedCodeSnippetFunction,
  CodeSnippetParameters,
  GettingStartedCodeSnippetParameters,
} from './types';

const CLIENT_SERVERLESS_OPTION = `\n  serverMode: 'serverless',`;

export const JAVASCRIPT_INFO: CodeLanguage = {
  id: 'javascript',
  title: i18n.translate('xpack.searchIndices.codingLanguages.javascript', {
    defaultMessage: 'Javascript (elasticsearch-js)',
  }),
  icon: 'javascript.svg',
  codeBlockLanguage: 'javascript',
};

const createClientSnippet = ({
  apiKey,
  elasticsearchURL,
  isServerless,
}: CodeSnippetParameters): string => `const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: '${apiKey}'
  },${isServerless ? CLIENT_SERVERLESS_OPTION : ''}
});`;

const installCommandShell = 'npm install @elastic/elasticsearch';

const gettingStartedSemantic: GettingStartedCodeSnippetFunction = (
  args: GettingStartedCodeSnippetParameters
) => `import { Client } from '@elastic/elasticsearch';

${createClientSnippet(args)}

// Define the name of the index you want to create
const index = '${GettingStartedCodeExample.indexName}';

// Create the index in Elasticsearch
// If the index already exists, this will throw an error
const createIndexResponse = await client.indices.create({ index });

console.log(createIndexResponse);

// Define a mapping for the index fields
const mapping = {
  "text": {
    "type": "semantic_text"
  }
};

// Update the index mapping with the defined properties
const updateMappingResponse = await client.indices.putMapping({
  index,
  properties: mapping,
});

console.log(updateMappingResponse);

// Define a timeout for operations that might require model loading or semantic indexing
const timeout = '5m';

// Define the documents to ingest into the index
const docs = ${JSON.stringify(args.sampleDocuments, null, 2)};

// Bulk ingest the documents into the index using the Elasticsearch helper
const bulkIngestResponse = await client.helpers.bulk({
  index,
  datasource: docs,
  timeout, // Wait for semantic models to be ready if needed
  onDocument() {
    return {
    // Return an empty index object to indicate a new document insertion
      index: {},
    };
  },
  refresh: "wait_for", // Wait until indexed documents are visible for search before returning the response
});

console.log(bulkIngestResponse);

// Define a search query body
// This uses a "retriever" query with multi_match to search the "text" field
const body = ${JSON.stringify(args.queryObject, null, 2)};

// Execute a search on the index using the defined query
const searchResult = await client.search({
  index,
  body,
});

// Log the search hits (documents that match the query)
console.log(searchResult.hits.hits);`;

export const JavascriptConnectDeploymentExample: GettingStartedCodeDefinition = {
  gettingStartedSemantic,
  installCommandShell,
};
