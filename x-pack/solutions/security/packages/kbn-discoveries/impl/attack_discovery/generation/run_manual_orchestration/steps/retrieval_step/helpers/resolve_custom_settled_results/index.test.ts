/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { CustomWorkflowAlertResult } from '../../../../../extract_custom_workflow_result';
import { resolveCustomSettledResults } from '.';

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const mockCustomResults: CustomWorkflowAlertResult[] = [
  {
    alerts: ['custom-alert-1'],
    alertsContextCount: 1,
    workflowId: 'custom-wf',
    workflowRunId: 'custom-run',
  },
];

describe('resolveCustomSettledResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the results when fulfilled', () => {
    const fulfilled: PromiseSettledResult<CustomWorkflowAlertResult[]> = {
      status: 'fulfilled',
      value: mockCustomResults,
    };

    const result = resolveCustomSettledResults({
      customSettled: fulfilled,
      logger: mockLogger,
    });

    expect(result).toEqual(mockCustomResults);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('returns an empty array when fulfilled with empty', () => {
    const fulfilled: PromiseSettledResult<CustomWorkflowAlertResult[]> = {
      status: 'fulfilled',
      value: [],
    };

    const result = resolveCustomSettledResults({
      customSettled: fulfilled,
      logger: mockLogger,
    });

    expect(result).toEqual([]);
  });

  it('throws when rejected', () => {
    const rejected: PromiseSettledResult<CustomWorkflowAlertResult[]> = {
      reason: new Error('custom failure'),
      status: 'rejected',
    };

    expect(() =>
      resolveCustomSettledResults({
        customSettled: rejected,
        logger: mockLogger,
      })
    ).toThrow('custom failure');
  });

  it('throws with the original error when rejected with non-Error reasons', () => {
    const rejected: PromiseSettledResult<CustomWorkflowAlertResult[]> = {
      reason: 'string-error',
      status: 'rejected',
    };

    expect(() =>
      resolveCustomSettledResults({
        customSettled: rejected,
        logger: mockLogger,
      })
    ).toThrow();
  });
});
