/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { goldenPathExamples } from './dataset';

/**
 * Regression test for the golden-path slice partitioning used by
 * `evals/attack_discovery_agent_builder.spec.ts`. Each `evaluate(...)` block
 * in that spec filters `goldenPathExamples` by `metadata.fixture` to build
 * an isolated per-scenario dataset. A mislabeled `fixture` on any example
 * silently merges two scenarios into one slice (or drops one to zero) with
 * no test failure elsewhere — this is exactly how the `missing-alert-retrieval`
 * example shipped tagged as `fixture: 'live-retrieval'`, so the "golden
 * live-retrieval" slice silently included a zero-alert negative control
 * alongside the real happy path.
 *
 * Filters here are copied verbatim from the spec file (not re-derived) so
 * this test breaks the moment the two drift apart.
 */
describe('goldenPathExamples fixture partitioning', () => {
  const filterByFixture = (fixture: string) =>
    goldenPathExamples.filter(({ metadata }) => metadata?.fixture === fixture);

  it('provided-alerts slice resolves to exactly one example', () => {
    expect(filterByFixture('provided-alerts')).toHaveLength(1);
  });

  it('live-retrieval slice resolves to exactly one example (the real happy path)', () => {
    const slice = filterByFixture('live-retrieval');
    expect(slice).toHaveLength(1);
    // The live-retrieval slice must be the happy path (alertCount > 0), not
    // the zero-alert negative control — that's the bug this test guards.
    expect(slice[0].metadata?.alertCount).toBeGreaterThan(0);
  });

  it('multiple-alert-sets slice resolves to exactly one example', () => {
    expect(filterByFixture('multiple-alert-sets')).toHaveLength(1);
  });

  it('missing-alert-retrieval slice resolves to exactly one example (the negative control)', () => {
    const slice = filterByFixture('missing-alert-retrieval');
    expect(slice).toHaveLength(1);
    expect(slice[0].metadata?.alertCount).toBe(0);
  });

  it('status-only slice resolves to exactly one example', () => {
    expect(filterByFixture('status-only')).toHaveLength(1);
  });

  it('every fixture-partitioned slice is mutually exclusive', () => {
    const fixtures = [
      'provided-alerts',
      'live-retrieval',
      'multiple-alert-sets',
      'missing-alert-retrieval',
      'status-only',
    ] as const;
    const seen = new Set<unknown>();
    for (const fixture of fixtures) {
      for (const example of filterByFixture(fixture)) {
        expect(seen.has(example)).toBe(false);
        seen.add(example);
      }
    }
    // Every example in the dataset must belong to exactly one of the five
    // named slices above — none silently dropped, none double-counted.
    expect(seen.size).toBe(goldenPathExamples.length);
  });
});
