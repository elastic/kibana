/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Resolves after the browser paints, so a loading state set right before the call becomes
 * visible before heavy synchronous work runs.
 * `requestAnimationFrame` callbacks run right before a paint, `setTimeout` moves past it.
 */
export function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}
