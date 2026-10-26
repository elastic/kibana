/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { AlertRetrievalResult } from '../../../../../invoke_alert_retrieval_workflow';
import { resolveLegacySettledResult } from '.';

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const mockLegacyResult: AlertRetrievalResult = {
  alerts: ['alert-1'],
  alertsContextCount: 1,
  anonymizedAlerts: [],
  apiConfig: {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  },
  connectorName: 'Test Connector',
  replacements: {},
  workflowExecutions: [{ workflowId: 'legacy', workflowRunId: 'legacy-run' }],
  workflowId: 'legacy',
  workflowRunId: 'legacy-run',
};

describe('resolveLegacySettledResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the result when fulfilled with a non-null value', () => {
    const fulfilled: PromiseSettledResult<AlertRetrievalResult | null> = {
      status: 'fulfilled',
      value: mockLegacyResult,
    };

    const result = resolveLegacySettledResult({
      legacySettled: fulfilled,
      logger: mockLogger,
    });

    expect(result).toEqual(mockLegacyResult);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Default alert retrieval completed: 1 alerts retrieved'
    );
  });

  it('returns null when fulfilled with null', () => {
    const fulfilled: PromiseSettledResult<AlertRetrievalResult | null> = {
      status: 'fulfilled',
      value: null,
    };

    const result = resolveLegacySettledResult({
      legacySettled: fulfilled,
      logger: mockLogger,
    });

    expect(result).toBeNull();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('throws when rejected even when custom workflows are available', () => {
    const error = new Error('boom');
    const rejected: PromiseSettledResult<AlertRetrievalResult | null> = {
      reason: error,
      status: 'rejected',
    };

    expect(() =>
      resolveLegacySettledResult({
        legacySettled: rejected,
        logger: mockLogger,
      })
    ).toThrow(error);
  });

  it('throws when rejected', () => {
    const error = new Error('boom');
    const rejected: PromiseSettledResult<AlertRetrievalResult | null> = {
      reason: error,
      status: 'rejected',
    };

    expect(() =>
      resolveLegacySettledResult({
        legacySettled: rejected,
        logger: mockLogger,
      })
    ).toThrow(error);

    expect(mockLogger.error).toHaveBeenCalledWith('Default alert retrieval failed: boom');
  });

  it('throws with non-Error rejection reasons', () => {
    const rejected: PromiseSettledResult<AlertRetrievalResult | null> = {
      reason: 'string-error',
      status: 'rejected',
    };

    expect(() =>
      resolveLegacySettledResult({
        legacySettled: rejected,
        logger: mockLogger,
      })
    ).toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith('Default alert retrieval failed: string-error');
  });
});
