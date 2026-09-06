/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

export const getHttpErrorStatus = (error: unknown): number | undefined =>
  isHttpFetchError(error) ? error.response?.status : undefined;

export const isHttpClientError = (error: unknown): boolean => {
  const status = getHttpErrorStatus(error);
  return status != null && status >= 400 && status < 500;
};

export const isHttpNotFoundError = (error: unknown): boolean => getHttpErrorStatus(error) === 404;
