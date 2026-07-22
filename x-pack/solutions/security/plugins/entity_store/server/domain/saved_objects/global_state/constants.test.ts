/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogExtractionConfig,
  LOG_EXTRACTION_DEFAULTS,
  LOG_EXTRACTION_FREQUENCY_DEFAULT,
  LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT,
  toLogExtractionOverrides,
} from './constants';

describe('toLogExtractionOverrides', () => {
  it('keeps only the fields that differ from the current defaults', () => {
    const overrides = toLogExtractionOverrides({
      frequency: '5m',
      maxLogsPerWindow: LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT,
      lookbackPeriod: '6h',
    });

    expect(overrides).toEqual({ frequency: '5m', lookbackPeriod: '6h' });
  });

  it('drops a value explicitly set to the current default (so it resumes tracking defaults)', () => {
    const overrides = toLogExtractionOverrides({ frequency: LOG_EXTRACTION_FREQUENCY_DEFAULT });

    expect(overrides).not.toHaveProperty('frequency');
  });

  it('drops a fully-resolved config down to an empty override set', () => {
    // A resolved config that never customized anything must persist as no overrides at all,
    // otherwise the stored defaults would shadow future default changes.
    expect(toLogExtractionOverrides(LOG_EXTRACTION_DEFAULTS)).toEqual({});
  });

  it('compares array values by content, not reference', () => {
    expect(toLogExtractionOverrides({ additionalIndexPatterns: [] })).toEqual({});
    expect(toLogExtractionOverrides({ additionalIndexPatterns: ['logs-*'] })).toEqual({
      additionalIndexPatterns: ['logs-*'],
    });
  });

  it('ignores undefined fields and unknown keys', () => {
    expect(
      toLogExtractionOverrides({
        frequency: undefined,
        // @ts-expect-error unknown key must be ignored, not persisted
        notARealField: 'x',
      })
    ).toEqual({});
  });
});

describe('read-time resolution of overrides', () => {
  it('fills unset fields from the current defaults while preserving overrides', () => {
    const resolved = LogExtractionConfig.parse(toLogExtractionOverrides({ frequency: '5m' }));

    expect(resolved.frequency).toBe('5m');
    expect(resolved.maxLogsPerWindow).toBe(LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT);
  });

  it('propagates a changed default to a store that never overrode the field', () => {
    // Simulate a store persisted with no overrides, then a default change: the resolved value
    // follows the new default rather than a stale persisted one.
    const storedOverrides = toLogExtractionOverrides({});
    const resolvedWithNewDefault = LogExtractionConfig.parse(storedOverrides).maxLogsPerWindow;

    expect(storedOverrides).not.toHaveProperty('maxLogsPerWindow');
    expect(resolvedWithNewDefault).toBe(LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT);
  });
});
