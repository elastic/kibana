/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
interface IndexDocumentsParams {
  es: Client;
  documents: Array<Record<string, unknown>>;
  index: string;
}

type IndexDocuments = (params: IndexDocumentsParams) => Promise<BulkResponse>;

/**
 * Indexes documents into provided index
 */
export const indexDocuments: IndexDocuments = async ({ es, documents, index }) => {
  const operations = documents.flatMap((doc: object) => [{ index: { _index: index } }, doc]);

  return es.bulk({ refresh: true, operations });
};

export const indexDocumentsFactory = ({ es, index }: Omit<IndexDocumentsParams, 'documents'>) => {
  return (documents: Array<Record<string, unknown>>) => indexDocuments({ es, index, documents });
};
