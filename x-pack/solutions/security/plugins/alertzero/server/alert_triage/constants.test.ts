/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DECISION_DAILY_CLOSE_CAP,
  TAG_CHUNK_SIZE,
  closedByDecisionTag,
  skippedByDecisionTag,
  toDecisionAutoCloseMode,
} from './constants';

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

// The sweep closes the alerts of a decision in chunks and goes on with the next chunk after one
// times out. That is only safe while a decision has one chunk to close per page. If this fails, read
// the `shortcut:` note in `closeAlerts` of the match sweep before raising the cap.
describe('the daily close cap', () => {
  it('fits in one chunk of a close', () => {
    expect(DECISION_DAILY_CLOSE_CAP).toBeLessThanOrEqual(TAG_CHUNK_SIZE);
  });
});
