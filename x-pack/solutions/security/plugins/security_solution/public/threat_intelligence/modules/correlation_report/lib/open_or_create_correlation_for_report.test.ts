/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openOrCreateCorrelationForReport } from './open_or_create_correlation_for_report';

describe('openOrCreateCorrelationForReport', () => {
  const reportId = 'report-abc';

  it('returns loaded when a prior run exists', async () => {
    const findLatestRunIdForReport = jest.fn().mockResolvedValue('run-1');
    const loadRun = jest.fn().mockResolvedValue(undefined);
    const startRun = jest.fn().mockResolvedValue(undefined);

    const result = await openOrCreateCorrelationForReport({
      reportId,
      findLatestRunIdForReport,
      loadRun,
      startRun,
    });

    expect(result).toBe('loaded');
  });

  it('loads the existing run id when a prior run exists', async () => {
    const findLatestRunIdForReport = jest.fn().mockResolvedValue('run-1');
    const loadRun = jest.fn().mockResolvedValue(undefined);
    const startRun = jest.fn().mockResolvedValue(undefined);

    await openOrCreateCorrelationForReport({
      reportId,
      findLatestRunIdForReport,
      loadRun,
      startRun,
    });

    expect(loadRun).toHaveBeenCalledWith('run-1');
  });

  it('does not start a new run when a prior run exists', async () => {
    const findLatestRunIdForReport = jest.fn().mockResolvedValue('run-1');
    const loadRun = jest.fn().mockResolvedValue(undefined);
    const startRun = jest.fn().mockResolvedValue(undefined);

    await openOrCreateCorrelationForReport({
      reportId,
      findLatestRunIdForReport,
      loadRun,
      startRun,
    });

    expect(startRun).not.toHaveBeenCalled();
  });

  it('returns created when no prior run exists', async () => {
    const findLatestRunIdForReport = jest.fn().mockResolvedValue(undefined);
    const loadRun = jest.fn().mockResolvedValue(undefined);
    const startRun = jest.fn().mockResolvedValue(undefined);

    const result = await openOrCreateCorrelationForReport({
      reportId,
      findLatestRunIdForReport,
      loadRun,
      startRun,
    });

    expect(result).toBe('created');
  });

  it('starts a full-depth report_id run when no prior run exists', async () => {
    const findLatestRunIdForReport = jest.fn().mockResolvedValue(undefined);
    const loadRun = jest.fn().mockResolvedValue(undefined);
    const startRun = jest.fn().mockResolvedValue(undefined);

    await openOrCreateCorrelationForReport({
      reportId,
      findLatestRunIdForReport,
      loadRun,
      startRun,
    });

    expect(startRun).toHaveBeenCalledWith({
      input_type: 'report_id',
      report_id: reportId,
      depth: 'full',
    });
  });
});
