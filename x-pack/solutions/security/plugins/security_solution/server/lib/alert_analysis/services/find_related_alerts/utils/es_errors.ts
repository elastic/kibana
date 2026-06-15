/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ElasticsearchErrorShape {
  meta?: { statusCode?: number };
  body?: { error?: { type?: string } };
  statusCode?: number;
}

export const isElasticsearchNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const esError = error as ElasticsearchErrorShape;
  const statusCode = esError.meta?.statusCode ?? esError.statusCode;
  const errorType = esError.body?.error?.type;

  return statusCode === 404 || errorType === 'document_missing_exception';
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
