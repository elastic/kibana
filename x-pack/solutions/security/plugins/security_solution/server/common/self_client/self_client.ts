/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  HttpSelfFetchQuery,
  HttpSelfFetchHeaders,
  HttpSelfFetchOptions,
  KibanaRequest,
} from '@kbn/core-http-server';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

/**
 * A normalized response from a self-client call to an internal Kibana endpoint.
 *
 * `ok: false` covers every non-2xx outcome (license failure, authz denial, not-found,
 * bad request) so the caller can surface a descriptive error instead of throwing. The
 * endpoint's own license/authz/validation already ran, so the status and body carry the
 * precise reason. Error bodies from Kibana routes always carry a `message` field
 * (core's error serialization shape is `{ statusCode, error, message }`).
 */
export type SelfClientResponse<T = unknown> =
  | { ok: true; status: number; body: T }
  | { ok: false; status: number; message: string; body?: unknown };

/**
 * Options for a single self-client call. A transparent proxy of `HttpSelfFetchOptions`
 * (the full selfClient fetch config surface: method, query, body, headers, signal,
 * timeout, prependBasePath, forwardRequestHeaders, …) with two defaults layered on top:
 * `access: 'internal'` and `version: '1'`. Both remain overridable per call.
 *
 * `asResponse` and `rawResponse` are not exposed: the client always calls with
 * `asResponse: true` so it can normalize the status code into `SelfClientResponse`.
 */
export type SelfClientCallOptions<TRequestBody = unknown> = Omit<
  HttpSelfFetchOptions<TRequestBody>,
  'asResponse' | 'rawResponse'
>;

interface HttpSelfFetchErrorLike extends Error {
  readonly response?: Response;
  readonly body?: unknown;
}

const isHttpSelfFetchError = (error: unknown): error is HttpSelfFetchErrorLike =>
  error instanceof Error && error.name === 'HttpSelfFetchError';

/**
 * Creates a self-client caller bound to the plugin's `core` setup. Each call is scoped
 * to the incoming request, so the outbound internal HTTP call runs as the current user
 * and reuses the endpoint's license/authz/validation. Defaults to internal, versioned
 * route access (`access: 'internal'`, `version: '1'`); override either per call when
 * targeting public or differently-versioned routes.
 */
export const createSelfClient = ({
  core,
  logger,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  logger: Logger;
}) => {
  return async <T = unknown, TRequestBody = unknown>(
    request: KibanaRequest,
    path: string,
    options: SelfClientCallOptions<TRequestBody> = {}
  ): Promise<SelfClientResponse<T>> => {
    try {
      const [coreStart] = await core.getStartServices();
      const response = await coreStart.http.selfClient
        .asScoped(request)
        .fetch<T, TRequestBody>(path, {
          ...options,
          access: options.access ?? 'internal',
          version: options.version ?? '1',
          asResponse: true,
        });
      return { ok: true, status: response.response.status, body: response.body as T };
    } catch (error) {
      const status = isHttpSelfFetchError(error) && error.response ? error.response.status : 500;
      const body = isHttpSelfFetchError(error) ? error.body : undefined;
      const message = error instanceof Error ? error.message : String(error);
      logger.debug(`Self-client call to ${path} failed (${status}): ${message}`);
      return { ok: false, status, message, body };
    }
  };
};

export type SelfClient = ReturnType<typeof createSelfClient>;

export type { HttpSelfFetchQuery, HttpSelfFetchHeaders };
