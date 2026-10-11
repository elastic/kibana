/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { describeRuleCoverage } from './attack_stage_tile';

describe('describeRuleCoverage', () => {
  it('leads with what is not working', () => {
    expect(describeRuleCoverage({ enabled: 2, effective: 1 })).toBe('1 of 2 rules not working');
  });

  it('flags thin coverage when every rule works', () => {
    expect(describeRuleCoverage({ enabled: 1, effective: 1 })).toBe('Only 1 detection rule');
    expect(describeRuleCoverage({ enabled: 2, effective: 2 })).toBe('Only 2 detection rules');
  });

  it('shows x/y working otherwise', () => {
    expect(describeRuleCoverage({ enabled: 4, effective: 4 })).toBe('4/4 rules working');
    expect(describeRuleCoverage({ enabled: 0, effective: 0 })).toBe('No detection rules');
  });
});
