/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { indexDocuments } from './index_documents';
import { generateDocuments } from './generate_documents';
import type { GenerateDocumentsParams } from './generate_documents';
import type { Document } from './types';

interface DataGeneratorParams {
  es: Client;
  documents: Array<Record<string, unknown>>;
  index: string;
  log: ToolingLog;
}

interface DataGenerator {
  indexListOfDocuments: (docs: Document[]) => ReturnType<typeof indexDocuments>;
  indexGeneratedDocuments: (params: GenerateDocumentsParams) => ReturnType<typeof indexDocuments>;
  indexGeneratedLogs: (params: GenerateDocumentsParams) => ReturnType<typeof indexDocuments>;
}

export const dataGeneratorFactory = ({
  es,
  index,
  log,
}: Omit<DataGeneratorParams, 'documents'>): DataGenerator => {
  return {
    indexListOfDocuments: (documents: DataGeneratorParams['documents']) => {
      return indexDocuments({ es, index, documents, log });
    },
    indexGeneratedDocuments: (params: GenerateDocumentsParams) => {
      const documents = generateDocuments(params);
      return indexDocuments({ es, index, documents, log });
    },
    indexGeneratedLogs: (params: GenerateDocumentsParams) => {
      const documents = generateDocuments(params);
      return indexDocuments({ es, index, documents, log });
    },
  };
};
