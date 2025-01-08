/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRiskScore } from './utils';

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
