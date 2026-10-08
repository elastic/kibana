/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * HTTP statuses from Elasticsearch worth waiting out. Shared so "transient"
 * means the same thing for task-level failures (opening a PIT, a search
 * request) and item-level bulk failures — previously each call site defined
 * its own ad-hoc subset of this list.
 */
export const TRANSIENT_ES_STATUSES: ReadonlySet<number> = new Set([408, 429, 500, 502, 503, 504]);

export const isTransientEsStatus = (status: unknown): boolean =>
  typeof status === 'number' && TRANSIENT_ES_STATUSES.has(status);
