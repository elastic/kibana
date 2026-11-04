/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkflowEvidenceEvaluator } from './workflow_evidence_evaluator';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderExpected,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';
import { EMPTY_RETRIEVAL_EVIDENCE } from '../types';

interface Params {
  input: AttackDiscoveryAgentBuilderExample['input'];
  output: AttackDiscoveryAgentBuilderTaskOutput;
  expected: AttackDiscoveryAgentBuilderExample['output'];
  metadata: AttackDiscoveryAgentBuilderExample['metadata'];
}

const baseOutput = (
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

const baseExpected = (
  overrides: Partial<AttackDiscoveryAgentBuilderExpected>
): AttackDiscoveryAgentBuilderExpected => ({
  expectedToolPath: [],
  expectedWorkflowStages: [],
  expectedRetrievedAlertCount: null,
  expectedPassedAlertCount: null,
  ...overrides,
});

describe('createWorkflowEvidenceEvaluator', () => {
  const evaluator = createWorkflowEvidenceEvaluator();

  // Fix 1: passedAlertCount must not silently mirror the pipeline's
  // retrieved count. Without the fix, `output.workflow.passedAlertCount`
  // would have been derived from the same source as retrievedAlertCount,
  // making this scenario indistinguishable from a real match.
  it('fails when the pipeline reports a passed count that does not match expectations', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: 10, passedAlertCount: 999 }),
      expected: baseExpected({ expectedRetrievedAlertCount: 10, expectedPassedAlertCount: 10 }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.score).toBe(0);
    expect(result.metadata?.evidenceState).toBe('complete');
  });

  it('scores complete and passes when both counts match exactly', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: 10, passedAlertCount: 10 }),
      expected: baseExpected({ expectedRetrievedAlertCount: 10, expectedPassedAlertCount: 10 }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.score).toBe(1);
    expect(result.metadata?.evidenceState).toBe('complete');
  });

  // Fix 3: a `null` expectation asserts the pipeline reports `null`, not an
  // excuse to skip scoring. Pre-fix, `passedCountAvailable` required
  // `expectedPassedAlertCount != null`, so these negative-path examples
  // always scored `undefined` / `incomplete` regardless of what the run
  // actually reported.
  it('fails when expectedPassedAlertCount is null but the run reports a bogus non-null count', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: null, passedAlertCount: 5 }),
      expected: baseExpected({ expectedRetrievedAlertCount: null, expectedPassedAlertCount: null }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(0);
  });

  it('passes when expectedPassedAlertCount is null and the run reports null', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: null, passedAlertCount: null }),
      expected: baseExpected({ expectedRetrievedAlertCount: null, expectedPassedAlertCount: null }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(1);
  });

  it('reports incomplete evidence when retrieval was expected but the pipeline never reported a count', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: null, passedAlertCount: null }),
      expected: baseExpected({ expectedRetrievedAlertCount: 10, expectedPassedAlertCount: null }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('incomplete');
    // `null`, not `undefined`: the aggregate drops it either way, but only
    // `null` + a label distinguishes incomplete evidence from an evaluator
    // that never ran.
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  // ABSENT (undefined) is the only "do not score the passed count" state:
  // `null` asserts `null` (see the Fix-3 tests above), so a dataset that wants
  // the passed count unscored must omit the key. Dense live-retrieval relies
  // on this — under a `null` pin its one complete-evidence run scored 0 on
  // golden no matter how well triage went.
  it('does not score the passed count when expectedPassedAlertCount is absent', async () => {
    // Build `expected` as a concrete object first: the key must be ABSENT, and
    // `delete` needs a non-optional receiver (example.output is optional).
    const expected = baseExpected({ expectedRetrievedAlertCount: 95 });
    delete expected.expectedPassedAlertCount;
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: 95, passedAlertCount: 23 }),
      expected,
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(1);
  });

  it('still fails on a retrieved-count mismatch when the passed count is unscored', async () => {
    const expected = baseExpected({ expectedRetrievedAlertCount: 95 });
    delete expected.expectedPassedAlertCount;
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: 12, passedAlertCount: 23 }),
      expected,
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(0);
  });

  it('treats a null retrieved expectation as dont-care, matching clean-profile behaviour', async () => {
    const params: Params = {
      input: {} as Params['input'],
      // Golden data: clean provided-alerts runs report retrieved=4 against a
      // `null` expectation and legitimately score 1.
      output: baseOutput({ retrievedAlertCount: 4, passedAlertCount: 4 }),
      expected: baseExpected({ expectedRetrievedAlertCount: null, expectedPassedAlertCount: 4 }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(1);
  });

  // The dense `provided`-mode shape: the pipeline reports no retrieved count (it
  // skipped retrieval by design), so the count comes from the agent's own ES|QL
  // retrieval. The score is no longer an `N/A`, and the metadata says which
  // source produced the number that was compared.
  it("scores a provided-mode run from the agent's own retrieval and names the source", async () => {
    const expected = baseExpected({ expectedRetrievedAlertCount: 95 });
    delete expected.expectedPassedAlertCount;
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({
        retrievedAlertCount: 95,
        retrievedAlertCountSource: 'agent_esql_retrieval',
        passedAlertCount: 16,
        retrievalEvidence: {
          ...EMPTY_RETRIEVAL_EVIDENCE,
          alertRetrievalMode: 'custom_query',
          agentEsqlRowCounts: [95],
        },
      }),
      expected,
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(1);
    expect(result.metadata?.retrievedAlertCountSource).toBe('agent_esql_retrieval');
    expect(result.metadata?.alertRetrievalMode).toBe('custom_query');
    expect(result.metadata?.agentEsqlRowCounts).toEqual([95]);
  });

  // A future `N/A` must be explainable from the score document alone: an
  // expectation that nothing observed reports `none` as the source rather than
  // leaving the reader to reconstruct why the evidence was incomplete.
  it('names the absence of a source when no observable reported a count', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCountSource: 'none' }),
      expected: baseExpected({ expectedRetrievedAlertCount: 95 }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('incomplete');
    expect(result.label).toBe('N/A');
    expect(result.metadata?.retrievedAlertCountSource).toBe('none');
    expect(result.metadata?.agentEsqlRowCounts).toEqual([]);
  });

  // The scope-violation shape: the run DID retrieve (97 rows from the alerts
  // index, plus the 95-row pipeline retrieval the AD call's unscoped query
  // produced) but under no marker the example declares, so it observed none of
  // this fixture's population. That scores 0 rather than `N/A`: an `N/A` is
  // dropped from the aggregate, so ignoring the marker would be the way to avoid
  // the retrieval assertion instead of the way to fail it. The metadata still
  // names the scope and both excluded sides, so the 0 is not mistaken for "the
  // agent never retrieved anything".
  it('scores 0 when every retrieval was excluded for not carrying the declared scope', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({
        retrievedAlertCount: 0,
        retrievedAlertCountSource: 'unscoped_retrieval',
        passedAlertCount: 16,
        retrievalEvidence: {
          ...EMPTY_RETRIEVAL_EVIDENCE,
          agentEsqlRowCounts: [97],
          retrievalScope: 'ad-scenario-registry-2026-07',
          unscopedAgentAlertRetrievalRowCounts: [97],
          unscopedPipelineAlertRetrievalCounts: [95, 95],
        },
      }),
      expected: baseExpected({ expectedRetrievedAlertCount: 95 }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(0);
    expect(result.label).toBeUndefined();
    expect(result.metadata?.retrievedAlertCountSource).toBe('unscoped_retrieval');
    expect(result.metadata?.retrievalScope).toBe('ad-scenario-registry-2026-07');
    expect(result.metadata?.unscopedAgentAlertRetrievalRowCounts).toEqual([97]);
    expect(result.metadata?.unscopedPipelineAlertRetrievalCounts).toEqual([95, 95]);
    expect(result.metadata?.agentEsqlRowCounts).toEqual([97]);
  });

  // The same dodge, one step earlier: making NO retrieval at all must not buy
  // an `N/A` either. The reader reports 0 for a scoped example that observed
  // none of its population, so the evidence is complete and the run is scored
  // — the source is `none` (nothing retrieved) rather than `unscoped_retrieval`,
  // which is what keeps the two findings apart in the metadata.
  it('scores 0 when the run made no retrieval at all', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({
        retrievedAlertCount: 0,
        retrievedAlertCountSource: 'none',
        passedAlertCount: 16,
        retrievalEvidence: {
          ...EMPTY_RETRIEVAL_EVIDENCE,
          retrievalScope: 'ad-scenario-registry-2026-07',
        },
      }),
      expected: baseExpected({ expectedRetrievedAlertCount: 95 }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(0);
    expect(result.label).toBeUndefined();
    expect(result.metadata?.retrievedAlertCountSource).toBe('none');
    expect(result.metadata?.retrievalScope).toBe('ad-scenario-registry-2026-07');
    expect(result.metadata?.unscopedAgentAlertRetrievalRowCounts).toEqual([]);
    expect(result.metadata?.agentEsqlRowCounts).toEqual([]);
  });
});
