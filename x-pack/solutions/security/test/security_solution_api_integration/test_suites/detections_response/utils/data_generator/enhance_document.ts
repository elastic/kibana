/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';

interface EnhanceDocumentOptions {
  id?: string;
  timestamp?: string;
  document: Record<string, unknown>;
}

/**
 * enhances document with generated id and timestamp
 * @param {string} options.id - optional id, if not provided randomly generated
 * @param {string} options.timestamp - optional timestamp of document, if not provided current time
 * @param {Record<string, unknown>} options.document - document that will be enhanced
 */
export const enhanceDocument = (options: EnhanceDocumentOptions) => {
  const id = options?.id ?? uuidv4();
  const timestamp = options?.timestamp ?? new Date().toISOString();
  return {
    ...options.document,
    id,
    '@timestamp': timestamp,
  };
};
