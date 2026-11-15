/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { checkExecutionRetention, runHuntLibraryPreflight } from './preflight';

const DAY = 86_400_000;

describe('checkExecutionRetention', () => {
  it('passes with no expiry and at or above the 90 day minimum', () => {
    expect(checkExecutionRetention({ retentionMs: null })).toEqual({
      ok: true,
      retentionDays: null,
    });
    expect(checkExecutionRetention({ retentionMs: 90 * DAY })).toEqual({
      ok: true,
      retentionDays: 90,
    });
    expect(checkExecutionRetention({ retentionMs: 400 * DAY }).ok).toBe(true);
  });

  it('fails below the minimum', () => {
    expect(checkExecutionRetention({ retentionMs: 89 * DAY })).toEqual({
      ok: false,
      retentionDays: 89,
      reason: 'retention_below_minimum',
    });
    expect(checkExecutionRetention({ retentionMs: 12 * 3_600_000 }).ok).toBe(false);
  });
});

describe('runHuntLibraryPreflight', () => {
  it('logs an error when retention is too short and still resolves', async () => {
    const logger = loggerMock.create();

    const result = await runHuntLibraryPreflight({
      getExecutionRetention: async () => ({ retentionMs: 30 * DAY }),
      logger,
    });

    expect(result.retention.ok).toBe(false);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('is silent when retention passes', async () => {
    const logger = loggerMock.create();

    const result = await runHuntLibraryPreflight({
      getExecutionRetention: async () => ({ retentionMs: null }),
      logger,
    });

    expect(result.retention.ok).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
