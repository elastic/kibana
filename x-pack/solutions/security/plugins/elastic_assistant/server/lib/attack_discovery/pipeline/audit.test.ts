/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { PipelineAuditLogger } from './audit';
import type { PipelineExecutionResult } from './types';

describe('PipelineAuditLogger', () => {
  const logger = loggingSystemMock.createLogger();
  let audit: PipelineAuditLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    audit = new PipelineAuditLogger(logger);
  });

  it('logs pipeline start', () => {
    audit.logStart('exec-1', 'default', false);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[pipeline-audit] pipeline_started')
    );
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('execution=exec-1'));
  });

  it('logs pipeline completion with metrics', () => {
    const result: PipelineExecutionResult = {
      executionId: 'exec-2',
      startedAt: '2025-01-01T00:00:00Z',
      completedAt: '2025-01-01T00:00:05Z',
      alertsProcessed: 10,
      alertsDeduplicated: 2,
      entitiesExtracted: 8,
      entitiesEnriched: 0,
      enrichmentStats: {},
      casesMatched: 3,
      casesCreated: 1,
      alertsAttached: 4,
      adTriggered: 1,
      errors: [],
    };

    audit.logComplete('exec-2', 'default', result);

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('pipeline_completed'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('"alertsProcessed":10'));
  });

  it('logs pipeline failure', () => {
    audit.logFailed('exec-3', 'default', 'ES connection timeout');

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('pipeline_failed'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('ES connection timeout'));
  });

  it('logs case creation', () => {
    audit.logCaseCreated('exec-4', 'sec-ops', 'case-123', 5);

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('case_created'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('"caseId":"case-123"'));
  });

  it('logs AD trigger', () => {
    audit.logAdTriggered('exec-5', 'default', 'case-456');

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('attack_discovery_triggered'));
  });
});
