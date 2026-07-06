/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { toAlertApiExecutionError } from './to_alert_api_execution_error';

describe('toAlertApiExecutionError', () => {
  it('returns the same ExecutionError instance untouched', () => {
    const original = new ExecutionError({ type: 'ApiError', message: 'boom' });

    expect(toAlertApiExecutionError(original, 'set alert tags')).toBe(original);
  });

  it('maps a KibanaApiCallError to an ExecutionError that persists only the scalar status', () => {
    const error = toAlertApiExecutionError(
      new KibanaApiCallError({
        status: 500,
        headers: { 'x-leaky-header': 'header-value' },
        body: { sensitive: 'partial-success-payload', items: [{ id: 'alert-1' }] },
        message: 'HTTP 500: bulk action partially failed',
      }),
      'set alert tags'
    );

    expect(error).toBeInstanceOf(ExecutionError);
    const serialized = error.toSerializableObject();
    expect(serialized.type).toBe('ApiError');
    expect(serialized.message).toBe(
      'Failed to set alert tags: HTTP 500: bulk action partially failed'
    );
    expect(serialized.details).toEqual({ status: 500 });
    expect(JSON.stringify(serialized.details)).not.toContain('partial-success-payload');
    expect(JSON.stringify(serialized.details)).not.toContain('x-leaky-header');
  });

  it('wraps a generic Error using its message', () => {
    const error = toAlertApiExecutionError(new Error('Network error'), 'assign alert');

    expect(error).toBeInstanceOf(ExecutionError);
    expect(error.toSerializableObject()).toMatchObject({
      type: 'ApiError',
      message: 'Network error',
    });
  });

  it('falls back to a generic message for non-Error throwables', () => {
    const error = toAlertApiExecutionError('some string', 'set attack status');

    expect(error.toSerializableObject()).toMatchObject({
      type: 'ApiError',
      message: 'Unknown error occurred',
    });
  });
});
