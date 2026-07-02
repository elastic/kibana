/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogExtractionConfig } from '../saved_objects';
import { mergeCadenceOverrides, getExplicitCadenceFields } from './cadence_overrides';

describe('mergeCadenceOverrides', () => {
  const globalConfig = LogExtractionConfig.parse({
    frequency: '1m',
    delay: '1m',
    lookbackPeriod: '3h',
  });

  it('returns the global config unchanged when there is no override', () => {
    expect(mergeCadenceOverrides(globalConfig, undefined)).toEqual(globalConfig);
  });

  it('returns the global config unchanged when all override fields are null', () => {
    const overrides = { frequency: null, delay: null, lookbackPeriod: null };
    expect(mergeCadenceOverrides(globalConfig, overrides)).toEqual(globalConfig);
  });

  it('overrides only frequency when only frequency is set', () => {
    const overrides = { frequency: '10m', delay: null, lookbackPeriod: null };
    expect(mergeCadenceOverrides(globalConfig, overrides)).toEqual({
      ...globalConfig,
      frequency: '10m',
    });
  });

  it('overrides all three cadence fields when all are set', () => {
    const overrides = { frequency: '30m', delay: '5m', lookbackPeriod: '6h' };
    expect(mergeCadenceOverrides(globalConfig, overrides)).toEqual({
      ...globalConfig,
      frequency: '30m',
      delay: '5m',
      lookbackPeriod: '6h',
    });
  });

  it('does not change non-cadence fields', () => {
    const overrides = { frequency: '10m', delay: null, lookbackPeriod: null };
    const merged = mergeCadenceOverrides(globalConfig, overrides);
    expect(merged.additionalIndexPatterns).toEqual(globalConfig.additionalIndexPatterns);
    expect(merged.docsLimit).toEqual(globalConfig.docsLimit);
    expect(merged.maxLogsPerWindow).toEqual(globalConfig.maxLogsPerWindow);
  });
});

describe('getExplicitCadenceFields', () => {
  it('returns an empty array when params is undefined', () => {
    expect(getExplicitCadenceFields(undefined)).toEqual([]);
  });

  it('returns an empty array when no cadence field is present', () => {
    const params: Record<string, unknown> = { fieldHistoryLength: 20 };
    expect(getExplicitCadenceFields(params)).toEqual([]);
  });

  it('returns only the explicitly present cadence fields', () => {
    expect(getExplicitCadenceFields({ delay: '2m' })).toEqual(['delay']);
  });

  it('returns all three when all cadence fields are present', () => {
    expect(
      getExplicitCadenceFields({ frequency: '5m', delay: '1m', lookbackPeriod: '3h' })
    ).toEqual(['frequency', 'delay', 'lookbackPeriod']);
  });

  it('treats an explicit null as present (not the same as absent)', () => {
    expect(getExplicitCadenceFields({ frequency: null })).toEqual(['frequency']);
  });
});
