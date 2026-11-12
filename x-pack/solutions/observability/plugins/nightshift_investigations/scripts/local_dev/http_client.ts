/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Redactor } from './secrets';

export class HttpError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number>;
  body?: string | object;
  /** `elastic-api-version`, for Kibana's versioned routes. */
  version?: string;
}

export type JsonRequest = <T>(path: string, options?: RequestOptions) => Promise<T>;

/**
 * A JSON client for Kibana or Elasticsearch with basic auth. Kibana's internal routes need the
 * internal origin header, which Elasticsearch ignores. Failures name the method, path and status,
 * with the response body redacted.
 */
export const createJsonClient = ({
  baseUrl,
  auth,
  redactor,
}: {
  baseUrl: string;
  auth: string;
  redactor: Redactor;
}): JsonRequest => {
  const authorization = `Basic ${Buffer.from(auth).toString('base64')}`;
  return async <T>(path: string, { method = 'GET', query, body, version }: RequestOptions = {}) => {
    const search = query
      ? `?${new URLSearchParams(
          Object.entries(query).map(([key, value]) => [key, String(value)])
        ).toString()}`
      : '';
    const response = await fetch(`${baseUrl}${path}${search}`, {
      method,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        'kbn-xsrf': 'nightshift-local-dev',
        'x-elastic-internal-origin': 'kibana',
        ...(version ? { 'elastic-api-version': version } : {}),
      },
      ...(body === undefined
        ? {}
        : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new HttpError(
        `${method} ${path} returned ${response.status}: ${redactor.redact(text).slice(0, 500)}`,
        response.status
      );
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new HttpError(`${method} ${path} returned a body that is not JSON`, response.status);
    }
  };
};

export const getHttpStatus = (error: unknown): number | undefined =>
  error instanceof HttpError ? error.status : undefined;

/**
 * Kibana's URL including its base path. `kibana --dev` serves under a random base path unless it
 * runs with `--no-base-path`; requests without it are redirected there.
 */
export const resolveKibanaBaseUrl = async (kibanaUrl: string): Promise<string> => {
  const base = kibanaUrl.replace(/\/+$/, '');
  const response = await fetch(`${base}/`, { redirect: 'manual' });
  const location = response.headers.get('location');
  if (!location) return base;
  const { pathname } = new URL(location, base);
  const segment = /^\/([a-z]{3})(\/|$)/.exec(pathname)?.[1];
  if (!segment) return base;
  // `/` can also redirect to an app such as `/app/home`, so only a path that serves the status API
  // is a base path.
  const candidate = `${base}/${segment}`;
  const status = await fetch(`${candidate}/api/status`, { redirect: 'manual' });
  const isRedirect = status.status >= 300 && status.status < 400;
  return status.status === 404 || isRedirect ? base : candidate;
};
