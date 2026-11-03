/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The HTTP status of an Elasticsearch client error, read from either place the client puts it. */
export const statusCodeOf = (error: unknown): number | undefined => {
  const { statusCode, meta } = (error ?? {}) as {
    statusCode?: number;
    meta?: { statusCode?: number };
  };
  return statusCode ?? meta?.statusCode;
};
