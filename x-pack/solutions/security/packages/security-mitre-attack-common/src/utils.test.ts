/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSoId } from './utils';

describe('buildSoId', () => {
  it('builds a colon-delimited id for a tactic', () => {
    expect(buildSoId({ framework: 'enterprise', frameworkVersion: '15.1', id: 'TA0001' })).toBe(
      'enterprise:15.1:TA0001'
    );
  });

  it('builds a colon-delimited id for a technique', () => {
    expect(buildSoId({ framework: 'enterprise', frameworkVersion: '15.1', id: 'T1003' })).toBe(
      'enterprise:15.1:T1003'
    );
  });

  it('builds a colon-delimited id for a dotted subtechnique id', () => {
    expect(buildSoId({ framework: 'enterprise', frameworkVersion: '15.1', id: 'T1003.001' })).toBe(
      'enterprise:15.1:T1003.001'
    );
  });
});
