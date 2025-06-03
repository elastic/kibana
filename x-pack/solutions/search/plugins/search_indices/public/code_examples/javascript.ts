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
  IngestDataCodeDefinition,
  SearchCodeDefinition,
  SearchCodeSnippetFunction,
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
const CLIENT_SERVERLESS_OPTION = `,\n    serverMode: 'serverless',`;

export const JavascriptCreateIndexExamples: CreateIndexLanguageExamples = {
  default: {
    installCommand: INSTALL_CMD,
    createIndex: ({
      elasticsearchURL,
      apiKey,
      indexName,
      isServerless,
    }) => `const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: '${apiKey ?? API_KEY_PLACEHOLDER}'${isServerless ? CLIENT_SERVERLESS_OPTION : ''}
  }
});

const createResponse = await client.indices.create({
  index: '${indexName ?? INDEX_PLACEHOLDER}',
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
    createIndex: ({
      elasticsearchURL,
      apiKey,
      indexName,
      isServerless,
    }) => `const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: '${apiKey ?? API_KEY_PLACEHOLDER}'${isServerless ? CLIENT_SERVERLESS_OPTION : ''}
  }
});

const createResponse = await client.indices.create({
  index: '${indexName ?? INDEX_PLACEHOLDER}',
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
    createIndex: ({
      elasticsearchURL,
      apiKey,
      indexName,
      isServerless,
    }) => `const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: '${apiKey ?? API_KEY_PLACEHOLDER}'${isServerless ? CLIENT_SERVERLESS_OPTION : ''}
  }
});

const createResponse = client.indices.create({
  index: '${indexName ?? INDEX_PLACEHOLDER}',
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
  ingestCommand: ({
    apiKey,
    elasticsearchURL,
    sampleDocuments,
    indexName,
    isServerless,
  }) => `const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: '${apiKey ?? API_KEY_PLACEHOLDER}'${isServerless ? CLIENT_SERVERLESS_OPTION : ''}
  },
});

const index = '${indexName}';
const docs = ${JSON.stringify(sampleDocuments, null, 2)};

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
  updateMappingsCommand: ({
    apiKey,
    elasticsearchURL,
    indexName,
    mappingProperties,
    isServerless,
  }) => `const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: '${apiKey ?? API_KEY_PLACEHOLDER}'${isServerless ? CLIENT_SERVERLESS_OPTION : ''}
  }
});

const index = '${indexName}';
const mapping = ${JSON.stringify(mappingProperties, null, 2)};

const updateMappingResponse = await client.indices.putMapping({
  index,
  properties: mapping,
});
console.log(updateMappingResponse);`,
};

const searchCommand: SearchCodeSnippetFunction = ({
  elasticsearchURL,
  apiKey,
  indexName,
  queryObject,
}) => `import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: "${apiKey ?? API_KEY_PLACEHOLDER}"
  }
});

const index = "${indexName}";
const query = ${JSON.stringify(queryObject, null, 2)};

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
  ingestCommand: ({
    apiKey,
    elasticsearchURL,
    sampleDocuments,
    indexName,
    isServerless,
  }) => `const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: '${apiKey ?? API_KEY_PLACEHOLDER}'${isServerless ? CLIENT_SERVERLESS_OPTION : ''}
  },
});

// Set the ingestion timeout to 5 minutes, to allow for semantic ingestion
// to complete. The initial ingest with semantic_text fields may take longer
// while the model loads, or ML nodes are allocated.
const timeout = '5m';

const index = '${indexName}';
const docs = ${JSON.stringify(sampleDocuments, null, 2)};

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
