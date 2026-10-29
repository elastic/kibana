/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canaryDataset } from '../datasets/canary';
import { goldenDataset } from '../datasets/golden';
import { hardCases } from '../datasets/hard_cases';
import { holdoutDataset } from '../datasets/holdout';
import type { HuntWatchExample } from './types';

/**
 * Shapes an expectation can take that make a pin vacuous: the row reads as covered while the
 * evaluator cannot score anything but 1. The type system allows them, so this test does not.
 */
const allRows: Array<[string, HuntWatchExample]> = [
  ...goldenDataset,
  ...hardCases,
  ...canaryDataset,
  ...holdoutDataset,
].map((row) => [row.id, row]);

describe('dataset expectations', () => {
  it.each(allRows)('%s pins no Proposal minimum of zero', (_id, row) => {
    for (const report of row.output.expected.reports) {
      const want = report.pendingProposals;
      if (want !== undefined && typeof want !== 'number') {
        // `{ min: 0 }` is `length >= 0`, which is always true. Omit the field instead.
        expect(want.min).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it.each(allRows)('%s pins where a partial run may stop when it accepts partial', (_id, row) => {
    const { outcome, incompleteStage } = row.output.expected;
    if (outcome?.includes('partial')) {
      // Without the stage, `partial` admits both Tier 2 stopping short and packaging giving up.
      expect(incompleteStage).toBeDefined();
    }
  });

  it('has a unique id per row across cohorts', () => {
    const ids = allRows.map(([id]) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
