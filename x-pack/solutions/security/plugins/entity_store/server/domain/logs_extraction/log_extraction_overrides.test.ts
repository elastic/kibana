/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogExtractionConfig } from '../saved_objects';
import { mergeLogExtractionOverrides, getExplicitOverrideFields } from './log_extraction_overrides';

describe('mergeLogExtractionOverrides', () => {
  const globalConfig = LogExtractionConfig.parse({
    frequency: '1m',
    delay: '1m',
    lookbackPeriod: '3h',
  });

  it('returns the global config unchanged when there is no override', () => {
    expect(mergeLogExtractionOverrides(globalConfig, undefined)).toEqual(globalConfig);
  });

  it('returns the global config unchanged when all override fields are null', () => {
    const overrides = { frequency: null, delay: null, lookbackPeriod: null };
    expect(mergeLogExtractionOverrides(globalConfig, overrides)).toEqual(globalConfig);
  });

  it('overrides only frequency when only frequency is set', () => {
    const overrides = { frequency: '10m', delay: null, lookbackPeriod: null };
    expect(mergeLogExtractionOverrides(globalConfig, overrides)).toEqual({
      ...globalConfig,
      frequency: '10m',
    });
  });

  it('overrides all three overridable fields when all are set', () => {
    const overrides = { frequency: '30m', delay: '5m', lookbackPeriod: '6h' };
    expect(mergeLogExtractionOverrides(globalConfig, overrides)).toEqual({
      ...globalConfig,
      frequency: '30m',
      delay: '5m',
      lookbackPeriod: '6h',
    });
  });

  it('does not change non-overridable fields', () => {
    const overrides = { frequency: '10m', delay: null, lookbackPeriod: null };
    const merged = mergeLogExtractionOverrides(globalConfig, overrides);
    expect(merged.additionalIndexPatterns).toEqual(globalConfig.additionalIndexPatterns);
    expect(merged.docsLimit).toEqual(globalConfig.docsLimit);
    expect(merged.maxLogsPerWindow).toEqual(globalConfig.maxLogsPerWindow);
  });
});

describe('getExplicitOverrideFields', () => {
  it('returns an empty array when params is undefined', () => {
    expect(getExplicitOverrideFields(undefined)).toEqual([]);
  });

  it('returns an empty array when no overridable field is present', () => {
    const params: Record<string, unknown> = { fieldHistoryLength: 20 };
    expect(getExplicitOverrideFields(params)).toEqual([]);
  });

  it('returns only the explicitly present overridable fields', () => {
    expect(getExplicitOverrideFields({ delay: '2m' })).toEqual(['delay']);
  });

  it('returns all three when all overridable fields are present', () => {
    expect(
      getExplicitOverrideFields({ frequency: '5m', delay: '1m', lookbackPeriod: '3h' })
    ).toEqual(['frequency', 'delay', 'lookbackPeriod']);
  });

  it('treats an explicit null as present (not the same as absent)', () => {
    expect(getExplicitOverrideFields({ frequency: null })).toEqual(['frequency']);
  });
});
