/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { httpStatus } from './kibana_api';

export type KbnRequest = (args: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  version?: string;
}) => Promise<{ statusCode: number; body: unknown }>;

/**
 * Adapts the evals `fetch` fixture, which throws on HTTP errors and by default returns only the
 * parsed body, to a request shape that returns the real status code (201/204 included) instead.
 */
export const kbnRequestFromFetch =
  (fetch: HttpHandler): KbnRequest =>
  async ({ method, path, body, version }) => {
    try {
      const { response } = await fetch(path, {
        method,
        asResponse: true,
        headers: version ? { 'elastic-api-version': version } : undefined,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response) throw new Error(`no response for ${method} ${path}`);
      const statusCode = response.status;
      // 204 (and other no-content statuses) have no body to parse.
      const parsed = response.body && statusCode !== 204 ? await response.json() : undefined;
      return { statusCode, body: parsed };
    } catch (error) {
      const statusCode = httpStatus(error);
      if (statusCode === undefined) throw error;
      return { statusCode, body: error instanceof Error ? error.message : error };
    }
  };

export const kbnErrorMessage = (body: unknown): string => {
  if (typeof body === 'string') return body;
  const message = (body as { message?: unknown } | undefined)?.message;
  return typeof message === 'string' ? message : JSON.stringify(body);
};
