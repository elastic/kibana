/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { HttpSelfFetchQuery, KibanaRequest } from '@kbn/core-http-server';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';

/**
 * A normalized response from a self-client call to an internal SIEM migration endpoint.
 *
 * `ok: false` covers every non-2xx outcome (license failure, authz denial, not-found,
 * bad request) so the calling tool can surface a descriptive error result instead of
 * throwing. The endpoint's own `withLicense` / `authz` / validation already ran, so the
 * status and body carry the precise reason.
 */
export type SiemMigrationResponse<T = unknown> =
  | { ok: true; status: number; body: T }
  | { ok: false; status: number; message: string; body?: unknown };

export interface CallSiemMigrationOptions {
  method?: string;
  query?: HttpSelfFetchQuery;
  body?: unknown;
  /**
   * API version for the versioned internal route. All SIEM migration routes are registered with
   * `.addVersion({ version: '1' })`. In dev mode, internal versioned routes do NOT default to a
   * version when the elastic-api-version header is absent, so the call 400s without this.
   */
  version?: string;
}

interface HttpSelfFetchErrorLike extends Error {
  readonly response?: Response;
  readonly body?: unknown;
}

const isHttpSelfFetchError = (error: unknown): error is HttpSelfFetchErrorLike =>
  error instanceof Error && error.name === 'HttpSelfFetchError';

/**
 * Creates a self-client caller bound to the plugin's `core` setup. Each call is scoped
 * to the incoming tool request, so the outbound internal HTTP call runs as the current
 * user and reuses the endpoint's license/authz/validation. All SIEM migration routes
 * are internal, so `access: 'internal'` is set unconditionally.
 */
export const createSiemMigrationClient = ({
  core,
  logger,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  logger: Logger;
}) => {
  return async <T = unknown>(
    request: KibanaRequest,
    path: string,
    options: CallSiemMigrationOptions = {}
  ): Promise<SiemMigrationResponse<T>> => {
    try {
      const [coreStart] = await core.getStartServices();
      const response = await coreStart.http.selfClient.asScoped(request).fetch<T>(path, {
        method: options.method ?? 'GET',
        query: options.query,
        body: options.body,
        access: 'internal',
        version: options.version ?? '1',
        asResponse: true,
      });
      return { ok: true, status: response.response.status, body: response.body as T };
    } catch (error) {
      const status = isHttpSelfFetchError(error) && error.response ? error.response.status : 500;
      const body = isHttpSelfFetchError(error) ? error.body : undefined;
      const message = error instanceof Error ? error.message : String(error);
      logger.debug(`SIEM migration self-client call to ${path} failed (${status}): ${message}`);
      return { ok: false, status, message, body };
    }
  };
};

export type SiemMigrationClient = ReturnType<typeof createSiemMigrationClient>;
