/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOOperationTimeout } from '../errors';

export interface Deadline {
  readonly signal: AbortSignal;
  readonly clear: () => void;
}

/**
 * Returns a signal aborted with an SLOOperationTimeout after the given delay; call clear() once the operation settles.
 */
export const createDeadline = (timeoutMs: number): Deadline => {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new SLOOperationTimeout(`Operation exceeded [${timeoutMs}ms]`)),
    timeoutMs
  );

  return { signal: controller.signal, clear: () => clearTimeout(timer) };
};
