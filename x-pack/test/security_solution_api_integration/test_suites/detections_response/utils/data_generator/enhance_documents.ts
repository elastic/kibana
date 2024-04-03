/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexingInterval, Document } from './types';
import { getTimestamp } from './get_timestamp';
import { enhanceDocument } from './enhance_document';

export interface EnhanceDocumentsOptions {
  interval?: IndexingInterval;
  documents: Document[];
  id?: string;
}

/**
 * enhances documents with generated id and timestamp within interval
 * @param {string} options.id - optional id, if not provided randomly generated
 * @param {string} options.interval - optional interval of document, if not provided set as a current time
 * @param {Record<string, unknown>[]} options.documents - documents that will be enhanced
 */
export const enhanceDocuments = ({ documents, interval, id }: EnhanceDocumentsOptions) => {
  return documents.map((document) =>
    enhanceDocument({
      document,
      id,
      timestamp: getTimestamp(interval),
    })
  );
};
