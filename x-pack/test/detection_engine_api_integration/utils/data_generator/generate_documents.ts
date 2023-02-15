/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import faker from 'faker';
import { isFunction } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { enhanceDocument } from './enhance_document';

import type { Document } from './types';

type DocumentSeedFunc = (index: number, id: string, timestamp: string) => Document;
type IndexInterval = [string | Date, string | Date];

interface GenerateDocumentsParamsSeed {
  interval?: IndexInterval;
  docsCount: number;
  seed: DocumentSeedFunc;
}

interface GenerateDocumentsParamsDoc {
  interval?: IndexInterval;
  docsCount: number;
  document: Document;
  enhance?: boolean;
}

export type GenerateDocumentsParams = GenerateDocumentsParamsSeed | GenerateDocumentsParamsDoc;

const isSeedDefined = (params: GenerateDocumentsParams): params is GenerateDocumentsParamsSeed => {
  return isFunction((params as GenerateDocumentsParamsSeed).seed);
};

const getTimestamp = (interval?: IndexInterval) => {
  if (interval) {
    return faker.date.between(...interval).toISOString();
  }

  return new Date().toISOString();
};

/**
 *
 * @param param.interval - interval in which generate documents, defined by '@timestamp' field
 * @param param.docsCount - number of document to generate
 * @param param.seed - seed function. Function that receives index of document, generated id, timestamp as arguments and can used it create a document
 * @param param.document - JSON of document to replicate
 * @param param.enhance - enhance document with {@link enhanceDocument} function if true
 * @returns
 */
export const generateDocuments = (params: GenerateDocumentsParams) => {
  const { docsCount, interval } = params;
  const documents = [];

  for (let i = 0; i < docsCount; i++) {
    const id = uuidv4();
    const timestamp = getTimestamp(interval);

    if (isSeedDefined(params)) {
      documents.push(params.seed(i, id, timestamp));
    } else {
      const { document, enhance = false } = params;
      documents.push(enhance ? enhanceDocument({ id, timestamp, document }) : document);
    }
  }

  return documents;
};
