/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { HttpFetchOptions, HttpFetchOptionsWithPath } from '@kbn/core-http-browser';
import type { ICPSManager } from '@kbn/cps-utils';

function mergeProjectRoutingHeader(
  options: HttpFetchOptions | undefined,
  projectRouting: string | undefined
): HttpFetchOptions | undefined {
  if (!projectRouting) {
    return options;
  }
  return {
    ...options,
    headers: {
      ...options?.headers,
      'x-project-routing': projectRouting,
    },
  };
}

/**
 * Ensures Infra UI HTTP calls include CPS project routing (same idea as APM's `createCallApmApi`).
 * Only `fetch` is wrapped; `get`/`post`/etc. delegate to `fetch` on the core HTTP client.
 */
export function wrapHttpWithProjectRouting(
  http: HttpStart,
  getCpsManager: () => ICPSManager | undefined
): HttpStart {
  return {
    ...http,
    fetch: ((pathOrOptions: string | HttpFetchOptionsWithPath, options?: HttpFetchOptions) => {
      const projectRouting = getCpsManager()?.getProjectRouting();
      if (!projectRouting) {
        // HttpHandler has multiple overloads; delegate unchanged.
        return (http.fetch as (path: unknown, options?: unknown) => ReturnType<HttpStart['fetch']>)(
          pathOrOptions,
          options
        );
      }
      if (typeof pathOrOptions === 'string') {
        return http.fetch(
          pathOrOptions,
          mergeProjectRoutingHeader(options, projectRouting) as HttpFetchOptions
        );
      }
      return http.fetch({
        ...pathOrOptions,
        headers: {
          ...pathOrOptions.headers,
          'x-project-routing': projectRouting,
        },
      });
    }) as HttpStart['fetch'],
  };
}
