/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closedByDecisionTag, skippedByDecisionTag, toDecisionAutoCloseMode } from './constants';

describe('toDecisionAutoCloseMode', () => {
  it.each(['shadow', 'on', 'off'] as const)('reads %s as itself', (mode) => {
    expect(toDecisionAutoCloseMode(mode)).toBe(mode);
  });

  // Customers can turn AlertZero on, so a missing or mistyped flag must not start tagging or
  // closing alerts: only an exact `shadow` or `on` turns decisions on.
  it.each(['', 'On', 'SHADOW', 'true', 'enabled'])('reads %p as off', (value) => {
    expect(toDecisionAutoCloseMode(value)).toBe('off');
  });
});

// Revoke finds the alerts of a decision by these tags, and the sweep writes them, so a change to
// their shape would leave alerts that a revoke can no longer find.
describe('the tags of a decision', () => {
  it('are the prefix followed by the decision id', () => {
    expect(closedByDecisionTag('fp-decision-0123456789abcdef')).toBe(
      'az:closed_by_decision:fp-decision-0123456789abcdef'
    );
    expect(skippedByDecisionTag('fp-dismissal-0123456789abcdef')).toBe(
      'az:skipped_by_decision:fp-dismissal-0123456789abcdef'
    );
  });
});
