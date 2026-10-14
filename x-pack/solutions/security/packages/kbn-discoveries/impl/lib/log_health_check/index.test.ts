/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { logHealthCheck } from '.';

const mockLogger = loggingSystemMock.createLogger();

describe('logHealthCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls logger.debug with a lazy function', () => {
    logHealthCheck(mockLogger, 'retrieval', { alertsIndexPattern: '.alerts' });

    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(typeof mockLogger.debug.mock.calls[0][0]).toBe('function');
  });

  it('formats a single precondition', () => {
    logHealthCheck(mockLogger, 'retrieval', { alertsIndexPattern: '.alerts' });

    const lazyFn = mockLogger.debug.mock.calls[0][0] as () => string;
    const message = lazyFn();

    expect(message).toBe('Health check [retrieval]: alertsIndexPattern=".alerts"');
  });

  it('formats multiple preconditions in insertion order', () => {
    logHealthCheck(mockLogger, 'generation', {
      alertCount: 42,
      connectorId: 'test-connector',
      workflowId: 'gen-workflow',
    });

    const lazyFn = mockLogger.debug.mock.calls[0][0] as () => string;
    const message = lazyFn();

    expect(message).toBe(
      'Health check [generation]: alertCount=42, connectorId="test-connector", workflowId="gen-workflow"'
    );
  });

  it('formats boolean preconditions', () => {
    logHealthCheck(mockLogger, 'validation', { persist: true });

    const lazyFn = mockLogger.debug.mock.calls[0][0] as () => string;
    const message = lazyFn();

    expect(message).toBe('Health check [validation]: persist=true');
  });

  it('formats undefined preconditions as null', () => {
    logHealthCheck(mockLogger, 'validation', { persist: undefined });

    const lazyFn = mockLogger.debug.mock.calls[0][0] as () => string;
    const message = lazyFn();

    expect(message).toBe('Health check [validation]: persist=undefined');
  });

  it('formats array preconditions', () => {
    logHealthCheck(mockLogger, 'retrieval', {
      customWorkflowIds: ['wf-1', 'wf-2'],
    });

    const lazyFn = mockLogger.debug.mock.calls[0][0] as () => string;
    const message = lazyFn();

    expect(message).toBe('Health check [retrieval]: customWorkflowIds=["wf-1","wf-2"]');
  });

  it('handles an empty preconditions record', () => {
    logHealthCheck(mockLogger, 'retrieval', {});

    const lazyFn = mockLogger.debug.mock.calls[0][0] as () => string;
    const message = lazyFn();

    expect(message).toBe('Health check [retrieval]: (none)');
  });
});
