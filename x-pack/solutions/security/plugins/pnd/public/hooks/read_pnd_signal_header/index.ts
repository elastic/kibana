/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reads one of PND's boolean **signal headers** off an `asResponse: true` fetch.
 *
 * PND has two of them, and both exist for the same reason: the response body is a
 * closed generated shape that cannot carry the distinction between "nothing to
 * show" and "we could not tell you". `x-pnd-attack-discovery-workflows-enabled`
 * separates an empty queue from a space where Attack Discovery 2.0 is off;
 * `x-pnd-execution-correlated` separates a lifecycle whose run has not reached
 * these rows yet from one where no run could be correlated at all.
 *
 * Only the two values the server stamps are believed. Anything else — a proxy
 * that dropped the header, an older server, a typo — leaves the answer
 * `undefined`, which is deliberately **not** the same claim as `false`: the
 * caller then falls back to what it can see rather than asserting a
 * configuration or correlation failure it has no evidence for.
 *
 * One primitive for both headers on purpose. A second copy would be one drift
 * away from PND's two signal headers being read with two different rules.
 */
export const readPndSignalHeader = (
  response: Response | undefined,
  headerName: string
): boolean | undefined => {
  const raw = response?.headers.get(headerName);

  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  return undefined;
};
