/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDEX_PLACEHOLDER } from '../constants';
import {
  IngestDataCodeDefinition,
  SearchCodeDefinition,
  SearchCodeSnippetFunction,
} from '../types';
import { CreateIndexLanguageExamples } from './types';

export const ConsoleCreateIndexExamples: CreateIndexLanguageExamples = {
  default: {
    createIndex: ({ indexName }) => `PUT /${indexName ?? INDEX_PLACEHOLDER}
{
  "mappings": {
    "properties":{
      "text":{
        "type":"text"
      }
    }
  }
}`,
  },
  dense_vector: {
    createIndex: ({ indexName }) => `PUT /${indexName ?? INDEX_PLACEHOLDER}
{
  "mappings": {
    "properties":{
      "vector":{
        "type": "dense_vector",
        "dims": 3
      },
      "text":{
        "type":"text"
      }
    }
  }
}`,
  },
  semantic: {
    createIndex: ({ indexName }) => `PUT /${indexName ?? INDEX_PLACEHOLDER}
{
  "mappings": {
    "properties":{
      "text":{
        "type":"semantic_text"
      }
    }
  }
}`,
  },
};

export const ConsoleIngestDataExample: IngestDataCodeDefinition = {
  ingestCommand: ({ indexName, sampleDocuments }) => {
    let result = 'POST /_bulk?pretty\n';
    sampleDocuments.forEach((document) => {
      result += `{ "index": { "_index": "${indexName}" } }
${JSON.stringify(document)}\n`;
    });
    result += '\n';
    return result;
  },
  updateMappingsCommand: ({ indexName, mappingProperties }) => `PUT /${indexName}/_mapping
${JSON.stringify({ properties: mappingProperties }, null, 2)}`,
};

const searchCommand: SearchCodeSnippetFunction = ({
  indexName,
  queryObject,
}) => `POST /${indexName}/_search
${JSON.stringify(queryObject, null, 2)}`;

export const ConsoleSearchExample: SearchCodeDefinition = {
  searchCommand,
};
