/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

/**
 * Returns a signal that aborts when `aborted$` (a request's `events.aborted$`) emits, so the
 * Elasticsearch queries of a request the client abandoned stop instead of running to completion.
 */
export const createAbortSignal = (aborted$: Observable<void>): AbortSignal => {
  const controller = new AbortController();
  // `aborted$` completes when the request ends, which ends the subscription.
  aborted$.subscribe(() => controller.abort());
  return controller.signal;
};
