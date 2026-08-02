/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readProposalDecision } from '.';

describe('readProposalDecision', () => {
  it('reads an approval', () => {
    expect(readProposalDecision({ decision: 'approve', rationale: 'Confirmed.' })).toBe('approve');
  });

  it('reads a dismissal', () => {
    expect(readProposalDecision({ decision: 'dismiss', rationale: 'Benign.' })).toBe('dismiss');
  });

  it('refuses a capitalized decision, which the route treats as invalid', () => {
    expect(readProposalDecision({ decision: 'Dismiss' })).toBeUndefined();
  });

  it('refuses a decision the enum does not close over', () => {
    expect(readProposalDecision({ decision: 'escalate' })).toBeUndefined();
  });

  it('refuses an answer with no decision at all', () => {
    expect(readProposalDecision({ rationale: 'Confirmed.' })).toBeUndefined();
  });

  it('refuses a non-string decision', () => {
    expect(readProposalDecision({ decision: true })).toBeUndefined();
  });
});
