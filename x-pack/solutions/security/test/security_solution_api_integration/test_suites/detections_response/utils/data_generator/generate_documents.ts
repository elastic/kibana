/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { getTimestamp } from './get_timestamp';

import type { Document, IndexingInterval } from './types';

type DocumentSeedFunc = (index: number, id: string, timestamp: string) => Document;

export interface GenerateDocumentsParams {
  interval?: IndexingInterval;
  docsCount: number;
  seed: DocumentSeedFunc;
}

/**
 *
 * @param param.interval - interval in which generate documents, defined by '@timestamp' field
 * @param param.docsCount - number of document to generate
 * @param param.seed - seed function. Function that receives index of document, generated id, timestamp as arguments and can used it create a document
 * @returns generated Documents
 */
export const generateDocuments = ({ docsCount, interval, seed }: GenerateDocumentsParams) => {
  const documents = [];

  for (let i = 0; i < docsCount; i++) {
    const id = uuidv4();
    const timestamp = getTimestamp(interval);

    documents.push(seed(i, id, timestamp));
  }

  return documents;
};
