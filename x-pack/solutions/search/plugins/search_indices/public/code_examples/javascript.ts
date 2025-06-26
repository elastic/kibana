/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { API_KEY_PLACEHOLDER, INDEX_PLACEHOLDER } from '../constants';
import {
  CodeLanguage,
  CodeSnippetParameters,
  IngestDataCodeDefinition,
  SearchCodeDefinition,
  SearchCodeSnippetFunction,
  SearchCodeSnippetParameters,
} from '../types';
import { CreateIndexLanguageExamples } from './types';

export const JAVASCRIPT_INFO: CodeLanguage = {
  id: 'javascript',
  title: i18n.translate('xpack.searchIndices.codingLanguages.javascript', {
    defaultMessage: 'Javascript',
  }),
  icon: 'javascript.svg',
  codeBlockLanguage: 'javascript',
};

const INSTALL_CMD = `npm install @elastic/elasticsearch`;
const CLIENT_SERVERLESS_OPTION = `\n  serverMode: 'serverless',`;

const createClientSnippet = ({
  apiKey,
  elasticsearchURL,
  isServerless,
}: CodeSnippetParameters): string => `const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: '${apiKey ?? API_KEY_PLACEHOLDER}'
  },${isServerless ? CLIENT_SERVERLESS_OPTION : ''}
});`;

export const JavascriptCreateIndexExamples: CreateIndexLanguageExamples = {
  default: {
    installCommand: INSTALL_CMD,
    createIndex: (args) => `const { Client } = require('@elastic/elasticsearch');

${createClientSnippet(args)}

const createResponse = await client.indices.create({
  index: '${args.indexName ?? INDEX_PLACEHOLDER}',
  mappings: {
    properties: {
      text: { type: 'text'}
    },
  });
}
console.log(createResponse);`,
  },
  dense_vector: {
    installCommand: INSTALL_CMD,
    createIndex: (args) => `const { Client } = require('@elastic/elasticsearch');

${createClientSnippet(args)}

const createResponse = await client.indices.create({
  index: '${args.indexName ?? INDEX_PLACEHOLDER}',
  mappings: {
    properties: {
      vector: { type: 'dense_vector', dims: 3 },
      text: { type: 'text'}
    },
  });
}
console.log(createResponse);`,
  },
  semantic: {
    installCommand: INSTALL_CMD,
    createIndex: (args) => `const { Client } = require('@elastic/elasticsearch');

${createClientSnippet(args)}

const createResponse = client.indices.create({
  index: '${args.indexName ?? INDEX_PLACEHOLDER}',
  mappings: {
    properties: {
      text: { type: 'semantic_text'}
    },
  });
}
console.log(createResponse);`,
  },
};

export const JSIngestDataExample: IngestDataCodeDefinition = {
  installCommand: INSTALL_CMD,
  ingestCommand: (args) => `const { Client } = require('@elastic/elasticsearch');

${createClientSnippet(args)}

const index = '${args.indexName}';
const docs = ${JSON.stringify(args.sampleDocuments, null, 2)};

const bulkIngestResponse = await client.helpers.bulk({
  index,
  datasource: docs,
  onDocument() {
    return {
      index: {},
    };
  }
});
console.log(bulkIngestResponse);`,
  updateMappingsCommand: (args) => `const { Client } = require('@elastic/elasticsearch');

${createClientSnippet(args)}

const index = '${args.indexName}';
const mapping = ${JSON.stringify(args.mappingProperties, null, 2)};

const updateMappingResponse = await client.indices.putMapping({
  index,
  properties: mapping,
});
console.log(updateMappingResponse);`,
};

const searchCommand: SearchCodeSnippetFunction = (
  args: SearchCodeSnippetParameters
) => `import { Client } from '@elastic/elasticsearch';

${createClientSnippet(args)}

const index = '${args.indexName}';
const query = ${JSON.stringify(args.queryObject, null, 2)};

const result = await client.search({
  index,
  query,
});

console.log(result.hits.hits);`;

export const JavascriptSearchExample: SearchCodeDefinition = {
  searchCommand,
};

export const JSSemanticIngestDataExample: IngestDataCodeDefinition = {
  ...JSIngestDataExample,
  ingestCommand: (args) => `const { Client } = require('@elastic/elasticsearch');

${createClientSnippet(args)}

// Timeout to allow machine learning model loading and semantic ingestion to complete
const timeout = '5m';

const index = '${args.indexName}';
const docs = ${JSON.stringify(args.sampleDocuments, null, 2)};

const bulkIngestResponse = await client.helpers.bulk({
  index,
  datasource: docs,
  timeout,
  onDocument() {
    return {
      index: {},
    };
  }
});

console.log(bulkIngestResponse);`,
};
