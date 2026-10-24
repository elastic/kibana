/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { goldenPathDataset, goldenPathExamples } from './dataset';
import { attackDiscoveryFixtureMarker } from './fixtures';

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

  // The example asserts an EXACT retrieved population against a shared alerts
  // index, so the retrieval it counts must be scoped to the fixture's own
  // marker. Declaring it here is what makes an unscoped query's row count — the
  // shared index's, not this fixture's — unable to satisfy the assertion.
  it('live-retrieval example declares the marker scope its question instructs', () => {
    const [example] = filterByFixture('live-retrieval');
    expect(example.input?.retrievalScope).toBe(attackDiscoveryFixtureMarker);
    expect(example.input?.question ?? '').toContain(attackDiscoveryFixtureMarker);
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

/**
 * The weekly build runs this cohort (`EVAL_GREP 'golden |non-golden'` in
 * `.buildkite/pipelines/evals/llm_evals.yml`), so the annotations the cap/floor
 * checks read have to be on the golden examples: in build 01a14b73 every one of
 * their cells was `null` with label `N/A`.
 */
describe('goldenPathExamples scoring annotations', () => {
  const slice = (fixture: string) => {
    const [example] = goldenPathExamples.filter(({ metadata }) => metadata?.fixture === fixture);
    expect(example).toBeDefined();
    return example;
  };

  const twoAlertFixtures = ['provided-alerts', 'live-retrieval', 'multiple-alert-sets'] as const;

  it.each(twoAlertFixtures)(
    '%s: the discovery ceiling is the population the fixture hands over, and the floor is 1',
    (fixture) => {
      const example = slice(fixture);

      // Two alerts forming ONE chain on finance-ws-01: a discovery cannot
      // aggregate fewer than one alert, so the ceiling is the fixture's own
      // population and not a threshold tuned to a recorded run.
      expect(example.metadata?.alertCount).toBe(2);
      expect(example.output?.maxDiscoveryCount).toBe(example.metadata?.alertCount);

      // The fixture's ground truth is a completed generation+validation pass
      // with a validated discovery (`expectedWorkflowStages`,
      // `attackDiscoveries`, `criteria`), so the floor is 1.
      expect(example.output?.minValidatedDiscoveryCount).toBe(1);
    }
  );

  // The two zero-alert fixtures hand the pipeline nothing, so a ceiling or
  // floor would assert about a discovery population that does not exist. Their
  // cap/floor cells stay `N/A` on purpose — and that label is what marks them as
  // non-scoring rather than failing cells.
  it.each(['missing-alert-retrieval', 'status-only'] as const)(
    '%s: no discovery population, so the cap/floor stay undeclared',
    (fixture) => {
      const example = slice(fixture);

      expect(example.metadata?.alertCount).toBe(0);
      expect(example.output?.maxDiscoveryCount).toBeUndefined();
      expect(example.output?.minValidatedDiscoveryCount).toBeUndefined();
    }
  );

  it.each(twoAlertFixtures)(
    '%s: an example that hands the pipeline alerts declares both annotations',
    (fixture) => {
      const example = slice(fixture);

      expect(Object.keys(example.output ?? {})).toEqual(
        expect.arrayContaining(['maxDiscoveryCount', 'minValidatedDiscoveryCount'])
      );
    }
  );

  it('declares NoiseFalsePositive non-scoring on this noise-free fixture', () => {
    // The fixture seeds ONLY the two marker alerts: `NoiseFalsePositive` has no
    // forbidden set to answer from, so the check is declared out of the weekly
    // run's scored set instead of answering a deliberate `N/A` per cell. The
    // full-profile cohort, whose examples declare noise ids, still scores it.
    expect(goldenPathDataset.nonScoringEvaluators).toEqual(['NoiseFalsePositive']);
    expect(goldenPathDataset.examples).toBe(goldenPathExamples);
  });
});
