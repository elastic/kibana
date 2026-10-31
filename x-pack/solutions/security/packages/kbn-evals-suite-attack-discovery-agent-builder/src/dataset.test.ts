/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { goldenPathExamples } from './dataset';
import { attackDiscoveryFixtureMarker } from './fixtures';
import { createWorkflowEvidenceEvaluator } from './evaluators/workflow_evidence_evaluator';
import { EMPTY_RETRIEVAL_EVIDENCE } from './types';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from './types';

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
 * F23a (bk-01a14b73): the zero-alert negative control must not pin the passed
 * count. `expectedPassedAlertCount: null` ASSERTS the run reports `null`
 * (workflow_evidence_evaluator.ts), so the example scored 0 for the four
 * families that correctly reported 0 alerts passed, while the two runs that
 * reported `null` scored 1 — a null-only expectation punishing a correct 0.
 * The example asks no passed-count question, so the key must be ABSENT.
 */
describe('missing-alert-retrieval passed-count contract', () => {
  const [negativeControl] = goldenPathExamples.filter(
    ({ metadata }) => metadata?.fixture === 'missing-alert-retrieval'
  );

  const workflowOutput = (
    overrides: Partial<AttackDiscoveryAgentBuilderTaskOutput['workflow']>
  ): AttackDiscoveryAgentBuilderTaskOutput => ({
    messages: [],
    steps: [],
    errors: [],
    workflow: {
      stages: [],
      retrievedAlertCount: null,
      retrievedAlertCountSource: 'none',
      passedAlertCount: null,
      validatedDiscoveryCount: null,
      retrievalEvidence: EMPTY_RETRIEVAL_EVIDENCE,
      ...overrides,
    },
  });

  it('leaves the passed count unscored instead of asserting a null report', () => {
    expect(negativeControl.output).not.toHaveProperty('expectedPassedAlertCount');
  });

  it('scores a run that correctly reports 0 passed alerts as a pass', async () => {
    const evaluator = createWorkflowEvidenceEvaluator();
    const result = await evaluator.evaluate({
      input: negativeControl.input as AttackDiscoveryAgentBuilderExample['input'],
      output: workflowOutput({ passedAlertCount: 0 }),
      expected: negativeControl.output as AttackDiscoveryAgentBuilderExample['output'],
      metadata: negativeControl.metadata as AttackDiscoveryAgentBuilderExample['metadata'],
    });

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(1);
  });
});
