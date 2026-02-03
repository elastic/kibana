/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export const isString = (value: unknown): value is string => typeof value === 'string';

export const formatError = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
};

export const getStatusCode = (e: unknown): number | undefined => {
  if (!isRecord(e)) return undefined;

  const statusCode = e.statusCode;
  if (typeof statusCode === 'number') return statusCode;

  // Axios-style errors (used by `@kbn/test`'s KbnClient):
  // error.response.status
  const response = e.response;
  if (isRecord(response) && typeof response.status === 'number') return response.status;

  const meta = e.meta;
  if (!isRecord(meta)) return undefined;

  const metaStatusCode = meta.statusCode;
  if (typeof metaStatusCode === 'number') return metaStatusCode;

  return undefined;
};
