/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** An error the routes turn into an HTTP response with this status code. */
export class DetectionEngineError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'DetectionEngineError';
  }
}

/** Message of anything thrown, for logs and the activity log. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

/** HTTP status of an Elasticsearch or Kibana error, when it has one. */
export function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const { statusCode, meta, output } = error as {
    statusCode?: unknown;
    meta?: { statusCode?: unknown };
    output?: { statusCode?: unknown };
  };
  const candidate = statusCode ?? meta?.statusCode ?? output?.statusCode;
  return typeof candidate === 'number' ? candidate : undefined;
}

export function isConflictError(error: unknown): boolean {
  return getStatusCode(error) === 409;
}

export function isNotFoundError(error: unknown): boolean {
  return getStatusCode(error) === 404;
}
