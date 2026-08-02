/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { applySpacePrefix } from '@kbn/workflows';

/** Result of a scoped self `GET`: the parsed body (when 2xx) and the HTTP status. */
export interface ScopedSelfGetResult<T> {
  /** Parsed JSON body. `undefined` for non-2xx responses or an empty body. */
  body: T | undefined;
  /** HTTP status code returned by the target route. */
  status: number;
}

export interface ScopedSelfGetParams {
  /** Core's HTTP start contract, source of the self client. */
  http: HttpServiceStart;
  /** Space-relative route path (no space segment), e.g. `/api/attack_discovery/_find`. */
  path: string;
  /** Query string parameters. */
  query?: Record<string, string | number | boolean | string[] | undefined>;
  /** The incoming request, used to scope the self call to the caller's identity. */
  request: KibanaRequest;
  /** Space id resolved from the request (security finding S9); prefixes the path for non-default spaces. */
  spaceId: string;
  /** `elastic-api-version` header value for the target versioned route. */
  version: string;
}

/**
 * Issue a `GET` against another Kibana route **as the calling user**, using Core's HTTP self
 * client scoped to the incoming request. Forwarding the caller's authorization is what enforces
 * the target route's own authorization (security finding S3): PND never resolves Attack Discovery
 * content as the internal user.
 *
 * `rawResponse: true` short-circuits the self client's throw-on-non-2xx behavior, so a `403`/`404`
 * from the target route is returned as a status rather than an exception. Genuine transport errors
 * still reject, so the caller's `try/catch` maps them to a `500`.
 *
 * The space is encoded in the path via {@link applySpacePrefix} (never taken from a parameter) and
 * `prependBasePath: false` keeps the self client from prefixing it a second time.
 */
export const scopedSelfGet = async <T>({
  http,
  path,
  query,
  request,
  spaceId,
  version,
}: ScopedSelfGetParams): Promise<ScopedSelfGetResult<T>> => {
  const { response } = await http.selfClient
    .asScoped(request)
    .fetch<T>(applySpacePrefix(path, spaceId), {
      asResponse: true,
      prependBasePath: false,
      query,
      rawResponse: true,
      version,
    });

  if (!response.ok) {
    return { body: undefined, status: response.status };
  }

  const text = await response.text();
  return { body: text ? (JSON.parse(text) as T) : undefined, status: response.status };
};
