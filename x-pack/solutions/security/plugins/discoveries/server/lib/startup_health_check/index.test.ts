/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

import { logStartupHealthCheck } from '.';

const EXPECTED_WORKFLOW_IDS = [
  'system-attack-discovery-alert-retrieval',
  'system-attack-discovery-generate',
  'system-attack-discovery-validate',
  'system-attack-discovery-run-example',
  'system-attack-discovery-custom-validation-example',
];

describe('logStartupHealthCheck', () => {
  let mockLogger: MockedLogger;

  beforeEach(() => {
    mockLogger = loggerMock.create();
  });

  it('logs INFO when all checks pass', () => {
    logStartupHealthCheck({
      expectedWorkflowIds: EXPECTED_WORKFLOW_IDS,
      failedWorkflowIds: [],
      logger: mockLogger,
      workflowsManagementApiAvailable: true,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('AD 2.0 managed workflows installed')
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('reports installed count as N/N in the success message', () => {
    logStartupHealthCheck({
      expectedWorkflowIds: EXPECTED_WORKFLOW_IDS,
      failedWorkflowIds: [],
      logger: mockLogger,
      workflowsManagementApiAvailable: true,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`${EXPECTED_WORKFLOW_IDS.length}/${EXPECTED_WORKFLOW_IDS.length}`)
    );
  });

  it('logs WARN when WorkflowsManagement API is not available', () => {
    logStartupHealthCheck({
      expectedWorkflowIds: EXPECTED_WORKFLOW_IDS,
      failedWorkflowIds: [],
      logger: mockLogger,
      workflowsManagementApiAvailable: false,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('WorkflowsManagement API is not available')
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('logs WARN when some managed workflows failed to install', () => {
    logStartupHealthCheck({
      expectedWorkflowIds: EXPECTED_WORKFLOW_IDS,
      failedWorkflowIds: [
        'system-attack-discovery-generate',
        'system-attack-discovery-alert-retrieval',
      ],
      logger: mockLogger,
      workflowsManagementApiAvailable: true,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('2 managed workflow(s) not installed')
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('system-attack-discovery-generate')
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('logs WARN with all issues when multiple checks fail', () => {
    logStartupHealthCheck({
      expectedWorkflowIds: EXPECTED_WORKFLOW_IDS,
      failedWorkflowIds: ['system-attack-discovery-generate'],
      logger: mockLogger,
      workflowsManagementApiAvailable: false,
    });

    const warnCall = mockLogger.warn.mock.calls[0]?.[0] as string;

    expect(warnCall).toContain('WorkflowsManagement API is not available');
    expect(warnCall).toContain('managed workflow(s) not installed');
    expect(mockLogger.info).not.toHaveBeenCalled();
  });
});
