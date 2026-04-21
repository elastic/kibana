/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRiskScore, safeErrorMessage } from './utils';

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
