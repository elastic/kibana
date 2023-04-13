/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { indexDocuments } from './index_documents';
import { generateDocuments } from './generate_documents';
import { enhanceDocuments, EnhanceDocumentsOptions } from './enhance_documents';
import type { GenerateDocumentsParams } from './generate_documents';
import type { Document } from './types';

interface DataGeneratorParams {
  es: Client;
  documents: Array<Record<string, unknown>>;
  index: string;
  log: ToolingLog;
}

interface DataGeneratorResponse {
  response: BulkResponse;
  documents: Document[];
}

interface DataGenerator {
  indexListOfDocuments: (docs: Document[]) => Promise<DataGeneratorResponse>;
  indexGeneratedDocuments: (params: GenerateDocumentsParams) => Promise<DataGeneratorResponse>;
  indexEnhancedDocuments: (params: EnhanceDocumentsOptions) => Promise<DataGeneratorResponse>;
}

/**
 * initialize {@link DataGenerator}
 * @param param.es - ES client
 * @param params.index - index where document will be added
 * @param params.log - logClient
 * @returns methods of {@link DataGenerator}
 */
export const dataGeneratorFactory = ({
  es,
  index,
  log,
}: Omit<DataGeneratorParams, 'documents'>): DataGenerator => {
  return {
    indexListOfDocuments: async (documents: DataGeneratorParams['documents']) => {
      const response = await indexDocuments({ es, index, documents, log });

      return {
        documents,
        response,
      };
    },
    indexGeneratedDocuments: async (params: GenerateDocumentsParams) => {
      const documents = generateDocuments(params);
      const response = await indexDocuments({ es, index, documents, log });

      return {
        documents,
        response,
      };
    },
    indexEnhancedDocuments: async (params: EnhanceDocumentsOptions) => {
      const documents = enhanceDocuments(params);
      const response = await indexDocuments({ es, index, documents, log });

      return {
        documents,
        response,
      };
    },
  };
};
