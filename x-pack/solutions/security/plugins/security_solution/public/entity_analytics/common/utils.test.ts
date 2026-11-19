/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskSeverity } from '../../../common/search_strategy';
import { esqlRecordsToSeverityCount, formatRiskScore, safeErrorMessage } from './utils';

describe('formatRiskScore', () => {
  it('returns two digits after the decimal separator', () => {
    expect(formatRiskScore(10)).toEqual('10.00');
    expect(formatRiskScore(10.5)).toEqual('10.50');
    expect(formatRiskScore(10.55)).toEqual('10.55');
    expect(formatRiskScore(10.555)).toEqual('10.56');
    expect(formatRiskScore(-1.4210854715202004e-14)).toEqual('0.00');
    expect(formatRiskScore(-15.4210854715202)).toEqual('-15.42'); // risk score contributions can be negative
    expect(formatRiskScore(8.421)).toEqual('8.42');
  });
});

describe('safeErrorMessage', () => {
  it('extracts body.message from Kibana HTTP response errors', () => {
    expect(safeErrorMessage({ body: { message: 'Not found' } })).toBe('Not found');
  });

  it('returns fallback when error has no body', () => {
    expect(safeErrorMessage({}, 'fallback')).toBe('fallback');
  });

  it('returns fallback when body.message is not a string', () => {
    expect(safeErrorMessage({ body: { message: 42 } }, 'fallback')).toBe('fallback');
  });

  it('returns undefined when no fallback and error is null', () => {
    expect(safeErrorMessage(null)).toBeUndefined();
  });

  it('returns undefined for non-object errors without a fallback', () => {
    expect(safeErrorMessage('string error')).toBeUndefined();
  });
});

describe('esqlRecordsToSeverityCount', () => {
  it('returns zeros for all severities when records is empty', () => {
    expect(esqlRecordsToSeverityCount([])).toEqual({
      [RiskSeverity.Critical]: 0,
      [RiskSeverity.High]: 0,
      [RiskSeverity.Moderate]: 0,
      [RiskSeverity.Low]: 0,
      [RiskSeverity.Unknown]: 0,
    });
  });

  it('maps each named severity level to its count', () => {
    const result = esqlRecordsToSeverityCount([
      { level: RiskSeverity.Critical, count: 5 },
      { level: RiskSeverity.High, count: 10 },
      { level: RiskSeverity.Moderate, count: 20 },
      { level: RiskSeverity.Low, count: 50 },
      { level: RiskSeverity.Unknown, count: 7 },
    ]);

    expect(result).toEqual({
      [RiskSeverity.Critical]: 5,
      [RiskSeverity.High]: 10,
      [RiskSeverity.Moderate]: 20,
      [RiskSeverity.Low]: 50,
      [RiskSeverity.Unknown]: 7,
    });
  });

  it('sums null-level rows with explicit Unknown rows into the Unknown bucket', () => {
    // This is the bug fix: ES|QL can return both a `level: null` row and a
    // `level: 'Unknown'` row for the same bucket. The previous `.find(...)`
    // implementation silently dropped one of them.
    const result = esqlRecordsToSeverityCount([
      { level: null, count: 49 },
      { level: RiskSeverity.Unknown, count: 118 },
      { level: RiskSeverity.Low, count: 15 },
      { level: RiskSeverity.Moderate, count: 158 },
      { level: RiskSeverity.High, count: 136 },
    ]);

    expect(result[RiskSeverity.Unknown]).toBe(167);
    expect(result).toEqual({
      [RiskSeverity.Critical]: 0,
      [RiskSeverity.High]: 136,
      [RiskSeverity.Moderate]: 158,
      [RiskSeverity.Low]: 15,
      [RiskSeverity.Unknown]: 167,
    });
  });

  it('treats missing counts as zero', () => {
    const result = esqlRecordsToSeverityCount([
      { level: RiskSeverity.Critical, count: undefined as unknown as number },
      { level: RiskSeverity.High, count: 3 },
    ]);

    expect(result[RiskSeverity.Critical]).toBe(0);
    expect(result[RiskSeverity.High]).toBe(3);
  });
});
