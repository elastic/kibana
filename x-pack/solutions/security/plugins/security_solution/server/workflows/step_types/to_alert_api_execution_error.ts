/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';

/**
 * Normalizes an error thrown while calling a detection-engine API from an alert workflow step
 * into an `ExecutionError`.
 *
 * `callKibanaApi` throws `KibanaApiCallError` on any non-2xx response. We persist only the safe
 * scalar `status` (the human-readable body snippet is already in `message`); the full body and
 * headers stay on the in-process error instance and are never serialized to ES. Step authors who
 * need the partial-success body can `catch (e) { if (e instanceof KibanaApiCallError) ... }`.
 *
 * @param error  The caught error.
 * @param action Short verb phrase for the failure message, e.g. `set alert tags`.
 */
export const toAlertApiExecutionError = (error: unknown, action: string): ExecutionError => {
  if (error instanceof ExecutionError) {
    return error;
  }
  if (error instanceof KibanaApiCallError) {
    return new ExecutionError({
      type: 'ApiError',
      message: `Failed to ${action}: ${error.message}`,
      details: { status: error.status },
    });
  }
  return new ExecutionError({
    type: 'ApiError',
    message: error instanceof Error ? error.message : 'Unknown error occurred',
  });
};
