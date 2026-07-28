/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation } from '@kbn/pnd-common';
import { briefActionLabel, isDecidedInvestigation } from '.';

const inv = (overrides: Partial<Investigation>): Investigation =>
  ({
    id: 'inv-test',
    title: 'Test investigation',
    pendingProposalCount: 1,
    ...overrides,
  } as unknown as Investigation);

/**
 * Regression coverage for the Brief-card / Proposals-tab consistency bug: the
 * card's primary CTA is derived from `primaryActionLabel` (a pre-decision
 * Watch-tier recommendation) which is never cleared once a decision lands, so
 * rendering it unconditionally made the queue say "Isolate endpoint" next to
 * a proposal whose own status already read "Escalated".
 */
describe('isDecidedInvestigation', () => {
  it('is false while a proposal is still pending, even on an escalated investigation', () => {
    expect(isDecidedInvestigation(inv({ status: 'escalated', pendingProposalCount: 1 }))).toBe(
      false
    );
  });

  it('is true once nothing is pending on a decided status', () => {
    expect(isDecidedInvestigation(inv({ status: 'escalated', pendingProposalCount: 0 }))).toBe(
      true
    );
    expect(isDecidedInvestigation(inv({ status: 'dismissed', pendingProposalCount: 0 }))).toBe(
      true
    );
    expect(isDecidedInvestigation(inv({ status: 'auto-resolved', pendingProposalCount: 0 }))).toBe(
      true
    );
  });

  it('is false for a pre-decision open investigation', () => {
    expect(isDecidedInvestigation(inv({ status: 'open', pendingProposalCount: 1 }))).toBe(false);
  });
});

describe('briefActionLabel', () => {
  it('reproduces the ransom-008 bug shape before the fix and asserts the fixed behaviour', () => {
    // Same shape as inv-floor-ransom-008: investigation status stuck at the
    // pre-decision 'escalated' value, but its one proposal is already
    // decided (pendingProposalCount recomputed to 0 by the reconciler).
    const decided = inv({
      status: 'escalated',
      pendingProposalCount: 0,
      primaryActionLabel: 'Isolate endpoint',
    });
    expect(briefActionLabel(decided)).toBe('Review decision');
    expect(briefActionLabel(decided)).not.toBe('Isolate endpoint');
  });

  it('still surfaces the Watch-recommended action while a decision is pending', () => {
    const pending = inv({
      status: 'escalated',
      pendingProposalCount: 1,
      primaryActionLabel: 'Isolate endpoint',
    });
    expect(briefActionLabel(pending)).toBe('Isolate endpoint');
  });

  it('keeps the Deep Watch findings review label regardless of pending count', () => {
    const deepWatchComplete = inv({
      status: 'deep-watch-complete',
      pendingProposalCount: 1,
      primaryActionLabel: 'Isolate endpoint',
    });
    expect(briefActionLabel(deepWatchComplete)).toBe('Review Deep Watch findings');
  });

  it('falls back to the default action label when nothing more specific applies', () => {
    const open = inv({ status: 'open', pendingProposalCount: 1, primaryActionLabel: undefined });
    expect(briefActionLabel(open)).toBe('Review');
  });
});
