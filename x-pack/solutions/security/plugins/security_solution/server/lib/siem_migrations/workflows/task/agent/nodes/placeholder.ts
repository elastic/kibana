/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** How long the placeholder waits so a stop request can abort the graph. */
export const PLACEHOLDER_TRANSLATION_DELAY_MS = 3_000;

/** Waits so stop can abort the graph. Tests replace this to simulate a failure. */
export const placeholderNoOpNode = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, PLACEHOLDER_TRANSLATION_DELAY_MS);
  });
