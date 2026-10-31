/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';

export interface ReadErrorDetails {
  statusCode?: number;
  errorType?: string;
}

export const readErrorDetails = (error: unknown): ReadErrorDetails => {
  if (error instanceof KibanaApiCallError) {
    return { statusCode: error.status };
  }
  if (typeof error !== 'object' || error === null) {
    return {};
  }
  const candidate = error as {
    meta?: { statusCode?: number; body?: { error?: { type?: string } } };
    statusCode?: number;
    body?: { error?: { type?: string } };
  };
  return {
    statusCode: candidate.meta?.statusCode ?? candidate.statusCode,
    errorType: candidate.meta?.body?.error?.type ?? candidate.body?.error?.type,
  };
};

export const isUnauthorized = (error: unknown): boolean => {
  const { statusCode, errorType } = readErrorDetails(error);
  return statusCode === 403 || errorType === 'security_exception';
};

export const isNotFound = (error: unknown): boolean => readErrorDetails(error).statusCode === 404;

export const isIndexNotFound = (error: unknown): boolean =>
  readErrorDetails(error).errorType === 'index_not_found_exception';

export const readErrorOutcome = <T extends string>(
  error: unknown,
  part: T
): { unauthorized: T } | { unavailable: T } =>
  isUnauthorized(error) ? { unauthorized: part } : { unavailable: part };
