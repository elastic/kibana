/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleFailureHint } from './rule_failure_hint';

describe('getRuleFailureHint', () => {
  it('explains the partial results error seen when a rule query cannot finish', () => {
    expect(
      getRuleFailureHint('watermark: ES|QL returned partial results; watermark will not advance')
    ).toContain('part of the results');
  });

  it('gives no hint for an error it has not seen', () => {
    expect(getRuleFailureHint('search_phase_execution_exception')).toBeUndefined();
  });

  it('gives no hint when there is no error text', () => {
    expect(getRuleFailureHint(null)).toBeUndefined();
  });
});
