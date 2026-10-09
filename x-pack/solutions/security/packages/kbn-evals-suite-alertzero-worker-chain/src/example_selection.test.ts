/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FP_TP_EXAMPLES } from '@kbn/evals-suite-attack-discovery-fp-tp/src/scenarios';
import {
  WORKER_CHAIN_CI_STEP_BUDGET_MS,
  WORKER_CHAIN_EXAMPLES_ENV,
  WORKER_CHAIN_EXAMPLE_COUNT,
  WORKER_CHAIN_MAX_CHAIN_MS,
  WORKER_CHAIN_SUBSETS,
} from './constants';
import {
  assertWorkerChainFitsCiBudget,
  deriveWorkerChainTimeoutMs,
  eligibleExampleIds,
  selectWorkerChainExamples,
  selectWorkerChainExampleIds,
} from './example_selection';

const outcomeOf = (id: string) =>
  FP_TP_EXAMPLES.find((example) => example.id === id)?.expectedOutcome;

describe('smoke6 subset', () => {
  const ids = WORKER_CHAIN_SUBSETS.smoke6;

  it('is pinned to exactly these six ids', () => {
    expect([...ids]).toEqual([
      'encoded-powershell.tp',
      'encoded-powershell.tp-entities-missing',
      'mimicrat-clickfix.tp',
      'encoded-powershell.fp',
      'mimicrat-clickfix.fp-benign-mimic',
      'mimicrat-clickfix.fp-network-only',
    ]);
  });

  it('every id is a runnable example, split 3 true_positive + 3 false_positive', () => {
    expect(ids.every((id) => eligibleExampleIds().includes(id))).toBe(true);
    expect(ids.filter((id) => outcomeOf(id) === 'true_positive')).toHaveLength(3);
    expect(ids.filter((id) => outcomeOf(id) === 'false_positive')).toHaveLength(3);
  });
});

describe('selectWorkerChainExampleIds', () => {
  it('selects every eligible example when the env var is unset or blank', () => {
    expect(selectWorkerChainExampleIds({})).toHaveLength(WORKER_CHAIN_EXAMPLE_COUNT);
    expect(selectWorkerChainExampleIds({ [WORKER_CHAIN_EXAMPLES_ENV]: '  ' })).toHaveLength(
      WORKER_CHAIN_EXAMPLE_COUNT
    );
  });

  it('honours the smoke6 named subset', () => {
    expect(selectWorkerChainExampleIds({ [WORKER_CHAIN_EXAMPLES_ENV]: 'smoke6' })).toEqual([
      ...WORKER_CHAIN_SUBSETS.smoke6,
    ]);
  });

  it('honours an explicit comma-separated id list, deduplicated', () => {
    expect(
      selectWorkerChainExampleIds({
        [WORKER_CHAIN_EXAMPLES_ENV]:
          'encoded-powershell.fp, encoded-powershell.tp,encoded-powershell.fp',
      })
    ).toEqual(['encoded-powershell.fp', 'encoded-powershell.tp']);
  });

  it('fails loudly on an unknown id instead of running a different set', () => {
    expect(() =>
      selectWorkerChainExampleIds({
        [WORKER_CHAIN_EXAMPLES_ENV]: 'encoded-powershell.tp,no-such-example',
      })
    ).toThrow(/unknown example\(s\): no-such-example/);
  });

  it('rejects a `failed` example, which the spec never runs', () => {
    expect(() =>
      selectWorkerChainExampleIds({
        [WORKER_CHAIN_EXAMPLES_ENV]: 'encoded-powershell.failed-missing-ad',
      })
    ).toThrow(/unknown example/);
  });
});

describe('deriveWorkerChainTimeoutMs', () => {
  it('is selected_count x repetitions x the per-chain bound', () => {
    expect(deriveWorkerChainTimeoutMs({})).toBe(
      WORKER_CHAIN_EXAMPLE_COUNT * WORKER_CHAIN_MAX_CHAIN_MS
    );
    expect(deriveWorkerChainTimeoutMs({ [WORKER_CHAIN_EXAMPLES_ENV]: 'smoke6' })).toBe(
      6 * WORKER_CHAIN_MAX_CHAIN_MS
    );
  });

  it('scales with the example count', () => {
    const one = deriveWorkerChainTimeoutMs({
      [WORKER_CHAIN_EXAMPLES_ENV]: 'encoded-powershell.tp',
    });
    const two = deriveWorkerChainTimeoutMs({
      [WORKER_CHAIN_EXAMPLES_ENV]: 'encoded-powershell.tp,encoded-powershell.fp',
    });
    expect(one).toBe(WORKER_CHAIN_MAX_CHAIN_MS);
    expect(two).toBe(2 * one);
  });

  it('scales with EVAL_REPETITIONS', () => {
    const env = { [WORKER_CHAIN_EXAMPLES_ENV]: 'smoke6' };
    expect(deriveWorkerChainTimeoutMs({ ...env, EVAL_REPETITIONS: '3' })).toBe(
      3 * deriveWorkerChainTimeoutMs(env)
    );
  });

  it('propagates the unknown-id failure rather than sizing a bogus run', () => {
    expect(() => deriveWorkerChainTimeoutMs({ [WORKER_CHAIN_EXAMPLES_ENV]: 'nope' })).toThrow(
      /unknown example/
    );
  });
});

describe('selectWorkerChainExamples (the spec subset filter)', () => {
  it('returns exactly the smoke6 worlds, in scenario order, when WORKER_CHAIN_EXAMPLES=smoke6', () => {
    const picked = selectWorkerChainExamples({ [WORKER_CHAIN_EXAMPLES_ENV]: 'smoke6' });
    expect(picked.map(({ id }) => id).sort()).toEqual([...WORKER_CHAIN_SUBSETS.smoke6].sort());
    expect(picked.map(({ id }) => id)).toEqual(
      FP_TP_EXAMPLES.map(({ id }) => id).filter((id) => WORKER_CHAIN_SUBSETS.smoke6.includes(id))
    );
  });

  it('returns only the listed ids for an explicit selection', () => {
    expect(
      selectWorkerChainExamples({ [WORKER_CHAIN_EXAMPLES_ENV]: 'encoded-powershell.fp' }).map(
        ({ id }) => id
      )
    ).toEqual(['encoded-powershell.fp']);
  });

  it('returns every eligible world, and never a `failed` one, when unset', () => {
    const picked = selectWorkerChainExamples({});
    expect(picked).toHaveLength(WORKER_CHAIN_EXAMPLE_COUNT);
    expect(picked.some(({ expectedOutcome }) => expectedOutcome === 'failed')).toBe(false);
  });
});

describe('assertWorkerChainFitsCiBudget', () => {
  it('refuses a Buildkite run whose derived timeout exceeds the step budget', () => {
    expect(deriveWorkerChainTimeoutMs({})).toBeGreaterThan(WORKER_CHAIN_CI_STEP_BUDGET_MS);
    expect(() => assertWorkerChainFitsCiBudget({ BUILDKITE: 'true' })).toThrow(
      /exceeds the Buildkite step budget of 120 min/
    );
  });

  it('does not constrain a controller run (not Buildkite)', () => {
    expect(() => assertWorkerChainFitsCiBudget({})).not.toThrow();
    expect(() =>
      assertWorkerChainFitsCiBudget({ [WORKER_CHAIN_EXAMPLES_ENV]: 'smoke6' })
    ).not.toThrow();
  });
});
