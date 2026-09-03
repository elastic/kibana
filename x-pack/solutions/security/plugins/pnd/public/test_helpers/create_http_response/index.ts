/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpResponse } from '@kbn/core-http-browser';

interface CreateHttpResponseParams<TResponseBody> {
  body?: TResponseBody;
  /**
   * Response headers, e.g. PND's `x-pnd-*` signal headers. Omit to model a
   * response that carries none — which is what a hook reading a header has to
   * cope with when it talks to an older server.
   */
  headers?: Record<string, string>;
}

/**
 * Builds the value an `asResponse: true` fetch resolves to, so a hook that reads
 * a **response header** can be tested without a real `fetch`.
 *
 * PND has two signal headers that only exist because the body cannot carry the
 * distinction — `x-pnd-attack-discovery-workflows-enabled` (an empty queue
 * because AD 2.0 is off in this space, versus a genuinely empty one) and
 * `x-pnd-execution-correlated` — and both are only reachable through
 * `asResponse`. Use this rather than hand-rolling a `Response` double per test:
 * `headers.get` is case-insensitive on a real `Response`, and a double that is
 * not will pass a test the browser would fail.
 */
export const createHttpResponse = <TResponseBody>({
  body,
  headers = {},
}: CreateHttpResponseParams<TResponseBody> = {}): HttpResponse<TResponseBody> => ({
  body,
  fetchOptions: { path: '' },
  request: {} as Request,
  response: { headers: new Headers(headers) } as Response,
});
