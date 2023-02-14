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

type Document = Record<string, unknown>;
type DocumentSeedFunc = (index: number, id: string, timestamp: string) => Document;

const getTimestamp = (interval?: [string | Date, string | Date]) => {
  if (interval) {
    return faker.date.between(...interval).toISOString();
  }

  return new Date().toISOString();
};

export interface GenerateDocumentsParams {
  interval?: [string | Date, string | Date];
  docsCount: number;
  seed: DocumentSeedFunc | Document;
  enhance?: boolean;
}

/**
 *
 * @param param.interval - interval in which generate documents, defined by '@timestamp' field
 * @param param.docsCount - number of document ot generate
 * @param param.seed - seed document fields. Function that receives
 * @param param0
 * @param param0
 * @returns
 */
export const generateDocuments = ({
  docsCount,
  interval,
  seed,
  enhance = true,
}: GenerateDocumentsParams) => {
  const documents = [];

  for (let i = 0; i < docsCount; i++) {
    const id = uuidv4();
    const timestamp = getTimestamp(interval);

    if (isFunction(seed)) {
      documents.push(seed(i, id, timestamp));
    } else {
      documents.push(enhance ? enhanceDocument({ id, timestamp, document: seed }) : seed);
    }
  }

  return documents;
};
