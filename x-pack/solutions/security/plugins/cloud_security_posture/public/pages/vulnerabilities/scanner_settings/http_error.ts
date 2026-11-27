/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';

export interface HttpErrorInfo {
  status?: number;
  /** The scanner routes' machine-readable `attributes.code`. */
  code?: string;
  message?: string;
}

interface ErrorBody {
  message?: string;
  attributes?: { code?: string };
}

export const getHttpErrorInfo = (error: unknown): HttpErrorInfo => {
  if (typeof error !== 'object' || error === null) return {};
  const { response, body, message } = error as Partial<IHttpFetchError<ErrorBody>>;
  return {
    status: response?.status,
    code: body?.attributes?.code,
    message: body?.message ?? (typeof message === 'string' ? message : undefined),
  };
};
