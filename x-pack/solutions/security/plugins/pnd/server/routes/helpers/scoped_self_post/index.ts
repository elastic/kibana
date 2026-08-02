/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { applySpacePrefix } from '@kbn/workflows';

/** Result of a scoped self `POST`: the parsed body (when 2xx) and the HTTP status. */
export interface ScopedSelfPostResult<T> {
  /** Parsed JSON body. `undefined` for non-2xx responses or an empty body. */
  body: T | undefined;
  /** HTTP status code returned by the target route. */
  status: number;
}

export interface ScopedSelfPostParams {
  /** `internal` stamps the internal-origin header the target route requires; defaults to `public`. */
  access?: 'public' | 'internal';
  /**
   * The request payload, as an **object**.
   *
   * ⚠️ Never `JSON.stringify` it. Core's self client (`serializeBody`) forwards a string body
   * untouched and sets `content-type` **only** for a non-string one, so a pre-serialized body
   * arrives at the target route as text and is answered with
   * `400 [request body]: Invalid input: expected object, received string`. Measured live on 9.6.0
   * against `PATCH /api/detection_engine/rules` (bead `kibana-z7xi.25`), and the reason
   * `patchDetectionRule` carries the same warning.
   */
  body: Record<string, unknown>;
  /** Core's HTTP start contract, source of the self client. */
  http: HttpServiceStart;
  /** Space-relative route path (no space segment), e.g. `/api/agent_builder/converse`. */
  path: string;
  /** The incoming request, used to scope the self call to the caller's identity. */
  request: KibanaRequest;
  /** Space id resolved from the request (security finding S9); prefixes the path for non-default spaces. */
  spaceId: string;
  /**
   * Milliseconds before the outbound call is aborted. Core defaults to 60 s, which is short for an
   * LLM turn, so a caller that fronts `/converse` must raise it deliberately rather than inherit it.
   */
  timeout?: number;
  /**
   * `elastic-api-version` header value for the target versioned route.
   *
   * Omitted for an **unversioned** target — Agent Builder's `_rename` is registered with
   * `router.post` rather than `router.versioned.post`, so it has no version to negotiate. The self
   * client sets the header only when a version is given, and the plain router ignores it either
   * way, so passing one there would be a header that means nothing.
   */
  version?: string;
}

/**
 * Issue a `POST` against another Kibana route **as the calling user**, using Core's HTTP self client
 * scoped to the incoming request (D7).
 *
 * The `POST` counterpart of `scopedSelfGet`, and it exists for the same reason: forwarding the
 * caller's authorization is what makes the target route enforce its own (security finding S3), so
 * PND never writes Agent Builder state as the internal user. `rawResponse: true` short-circuits the
 * self client's throw-on-non-2xx behaviour, so a `403`/`404` from the target route comes back as a
 * status the caller can act on rather than as an exception; genuine transport errors still reject.
 *
 * The space is encoded in the path via {@link applySpacePrefix} (never taken from a parameter) and
 * `prependBasePath: false` keeps the self client from prefixing it a second time.
 */
export const scopedSelfPost = async <T>({
  access = 'public',
  body,
  http,
  path,
  request,
  spaceId,
  timeout,
  version,
}: ScopedSelfPostParams): Promise<ScopedSelfPostResult<T>> => {
  const { response } = await http.selfClient
    .asScoped(request)
    .fetch<T>(applySpacePrefix(path, spaceId), {
      access,
      asResponse: true,
      // the object, not a JSON string — see the note on `body` above
      body,
      method: 'POST',
      prependBasePath: false,
      rawResponse: true,
      ...(timeout == null ? {} : { timeout }),
      version,
    });

  if (!response.ok) {
    return { body: undefined, status: response.status };
  }

  const text = await response.text();
  return { body: text ? (JSON.parse(text) as T) : undefined, status: response.status };
};
