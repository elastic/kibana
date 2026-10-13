/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-security';
import { INTERNAL_HEADERS, POLL_INTERVAL_MS, PUBLIC_HEADERS } from './constants';

export type Headers = Record<string, string>;
export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiResult<T> {
  statusCode: number;
  body: T;
}

/** Kibana API calls as the admin user: SAML cookie plus the route's access-level headers. */
export interface AlertZeroApi {
  internal: <T = unknown>(
    method: Method,
    path: string,
    options?: { body?: unknown; query?: Record<string, string | number | boolean> }
  ) => Promise<ApiResult<T>>;
  public: <T = unknown>(
    method: Method,
    path: string,
    options?: { body?: unknown }
  ) => Promise<ApiResult<T>>;
}

export const createApi = (apiClient: ApiClientFixture, cookieHeader: Headers): AlertZeroApi => {
  const send = async <T>(
    method: Method,
    path: string,
    headers: Headers,
    body?: unknown
  ): Promise<ApiResult<T>> => {
    const response = await apiClient[method.toLowerCase() as Lowercase<Method>]<T>(path, {
      headers: { ...cookieHeader, ...headers },
      body,
      responseType: 'json',
    });
    return { statusCode: response.statusCode, body: response.body };
  };
  const withQuery = (path: string, query?: Record<string, string | number | boolean>) =>
    query ? `${path}?${new URLSearchParams(query as Record<string, string>).toString()}` : path;

  return {
    internal: (method, path, options) =>
      send(method, withQuery(path, options?.query), INTERNAL_HEADERS, options?.body),
    public: (method, path, options) => send(method, path, PUBLIC_HEADERS, options?.body),
  };
};

/** Resolves with the body of a 2xx response; anything else fails with the status and body. */
export const ok = <T>(result: ApiResult<T>, label: string): T => {
  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`${label} failed: ${result.statusCode} ${JSON.stringify(result.body)}`);
  }
  return result.body;
};

/**
 * Bounded polling. Resolves with the first non-undefined value `read` returns; a timeout throws,
 * so a flow that never gets there is a failure, never a skip.
 */
export const pollUntil = async <T>(
  label: string,
  read: () => Promise<T | undefined>,
  { timeoutMs, intervalMs = POLL_INTERVAL_MS }: { timeoutMs: number; intervalMs?: number }
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  for (;;) {
    try {
      const value = await read();
      if (value !== undefined) {
        return value;
      }
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
    if (Date.now() >= deadline) {
      const cause = lastError instanceof Error ? `; last error: ${lastError.message}` : '';
      throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}${cause}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

interface ActionsConnector {
  id: string;
  actionTypeId: string;
  config?: { taskType?: string };
}

/**
 * Preconfigured chat-completion inference connectors on this stack, via the public Actions
 * list route. Empty on a stack booted without a connector source (plain CI): the e2e specs
 * use this to skip their LLM-dependent flow with an explicit reason instead of failing.
 */
export const listChatCompletionConnectors = async (
  api: AlertZeroApi
): Promise<ActionsConnector[]> => {
  const result = await api.public<ActionsConnector[]>('GET', '/api/actions/connectors');
  if (result.statusCode !== 200) {
    throw new Error(`listing connectors failed: ${result.statusCode}`);
  }
  return result.body.filter(
    (connector) =>
      connector.actionTypeId === '.inference' && connector.config?.taskType === 'chat_completion'
  );
};
