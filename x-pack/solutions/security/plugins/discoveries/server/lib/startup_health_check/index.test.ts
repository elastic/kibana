/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

import { logStartupHealthCheck } from '.';

describe('logStartupHealthCheck', () => {
  let mockLogger: MockedLogger;

  beforeEach(() => {
    mockLogger = loggerMock.create();
  });

  it('logs INFO when all checks pass', () => {
    logStartupHealthCheck({
      failedStepIds: [],
      logger: mockLogger,
      registeredStepCount: 6,
      workflowsManagementApiAvailable: true,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Startup health check passed')
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('includes registered step count in the success message', () => {
    logStartupHealthCheck({
      failedStepIds: [],
      logger: mockLogger,
      registeredStepCount: 6,
      workflowsManagementApiAvailable: true,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('6 workflow step(s) registered')
    );
  });

  it('logs WARN when WorkflowsManagement API is not available', () => {
    logStartupHealthCheck({
      failedStepIds: [],
      logger: mockLogger,
      registeredStepCount: 6,
      workflowsManagementApiAvailable: false,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('WorkflowsManagement API is not available')
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('logs WARN when some workflow steps failed to register', () => {
    logStartupHealthCheck({
      failedStepIds: ['attack-discovery.generate', 'attack-discovery.run'],
      logger: mockLogger,
      registeredStepCount: 4,
      workflowsManagementApiAvailable: true,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('2 workflow step(s) failed to register')
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('attack-discovery.generate')
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('logs WARN with all issues when multiple checks fail', () => {
    logStartupHealthCheck({
      failedStepIds: ['attack-discovery.generate'],
      logger: mockLogger,
      registeredStepCount: 5,
      workflowsManagementApiAvailable: false,
    });

    const warnCall = mockLogger.warn.mock.calls[0]?.[0] as string;

    expect(warnCall).toContain('WorkflowsManagement API is not available');
    expect(warnCall).toContain('workflow step(s) failed to register');
    expect(mockLogger.info).not.toHaveBeenCalled();
  });
});
