/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import {
  AUDIT_CONDITIONAL_REMEDIATION_JUDGE_EVALUATOR_NAME,
  POSITIVE_CONTROL_RECALL_THRESHOLD,
} from '@kbn/evals-suite-attack-discovery';
import { computeScoreStats } from '../score_stats';
import type { CohortRouting } from '../cohort_routing';
import {
  createAuditEvaluators,
  createCodeEvaluators,
  type WorkerEvaluator,
} from './dataset_evaluator';
import {
  assertCodeScoresPass,
  createRunCollector,
  describeRow,
  isCodeMiss,
  logQualityMisses,
  MODEL_FAULT_CODE_EVALUATORS,
  PIPELINE_CODE_EVALUATORS,
  QUALITY_CODE_EVALUATORS,
  ROW_FAILED_LABEL,
  SAFETY_CODE_EVALUATORS,
  withScoreCollection,
} from './run_summary';
import { MODEL_FAULT_LABEL } from './code_scores';

const ROW = {
  input: { scenarioId: 'positive-chain-with-noise', spaceId: 'space' },
  output: {},
  expected: undefined,
  metadata: undefined,
} as unknown as Parameters<WorkerEvaluator['evaluate']>[0];

const evaluatorScoring = ({
  name,
  kind = 'CODE',
  score,
  label,
}: {
  name: string;
  kind?: 'CODE' | 'LLM';
  score: number | null;
  label?: string;
}): WorkerEvaluator => ({
  name,
  kind,
  direction: 'maximize',
  evaluate: async () => ({ score, label }),
});

const gate = async (evaluator: WorkerEvaluator) => {
  const collector = createRunCollector();
  const [wrapped] = withScoreCollection([evaluator], collector);
  await wrapped.evaluate(ROW);
  return collector.codeFailures;
};

const ROUTING = {
  cohort: 'whole',
  generationModel: 'm',
  reviewModel: 'm',
} as unknown as CohortRouting;

/** Registers the audit evaluators with the LLM judge included, as the real run does. */
const registeredEvaluators = (): WorkerEvaluator[] => [
  ...createCodeEvaluators(ROUTING),
  ...createAuditEvaluators({
    routing: ROUTING,
    judge: {
      inferenceClient: { bindTo: jest.fn() },
      log: {} as ToolingLog,
      // A stub client suffices: the judge's evaluate is never invoked here, only its name/kind.
    } as unknown as NonNullable<Parameters<typeof createAuditEvaluators>[0]>['judge'],
  }),
];

describe('CODE gate', () => {
  describe('pipeline vs quality evaluators', () => {
    const registered = registeredEvaluators();
    const registeredCodeNames = registered
      .filter(({ kind }) => kind === 'CODE')
      .map(({ name }) => name);
    const registeredNames = registered.map(({ name }) => name);

    it('classifies every registered CODE evaluator as exactly one of pipeline, quality or safety', () => {
      expect(registeredCodeNames.length).toBeGreaterThan(0);
      const misclassified = registeredCodeNames.filter((name) => {
        const memberships = [
          PIPELINE_CODE_EVALUATORS.has(name),
          QUALITY_CODE_EVALUATORS.has(name),
          SAFETY_CODE_EVALUATORS.has(name),
        ];
        return memberships.filter(Boolean).length !== 1;
      });
      expect(misclassified).toEqual([]);
    });

    it('names no evaluator that is not registered', () => {
      // Any kind: the SAFETY set lists the judge (kind LLM) as classification-only documentation.
      const unknown = [
        ...PIPELINE_CODE_EVALUATORS,
        ...QUALITY_CODE_EVALUATORS,
        ...SAFETY_CODE_EVALUATORS,
      ].filter((name) => !registeredNames.includes(name));
      expect(unknown).toEqual([]);
    });

    it('keeps every LLM-kind evaluator out of the CODE classification and the gate', () => {
      const llmNames = registered.filter(({ kind }) => kind === 'LLM').map(({ name }) => name);
      expect(llmNames).toContain(AUDIT_CONDITIONAL_REMEDIATION_JUDGE_EVALUATOR_NAME);
      // The judge is classified in SAFETY for documentation but never gated by kind.
      llmNames.forEach((name) => {
        expect(registeredCodeNames).not.toContain(name);
      });
    });

    it.each([...SAFETY_CODE_EVALUATORS])(
      '%s: a miss fails the dataset despite measuring the model',
      async (name) => {
        const failures = await gate(evaluatorScoring({ name, score: 0 }));
        expect(failures).toHaveLength(1);
        expect(() => assertCodeScoresPass('dataset', failures)).toThrow(new RegExp(name));
      }
    );

    it.each([...SAFETY_CODE_EVALUATORS])(
      '%s: an N/A row does not fail the dataset',
      async (name) => {
        const failures = await gate(evaluatorScoring({ name, score: null, label: 'N/A' }));
        expect(failures).toEqual([]);
      }
    );

    it.each([...QUALITY_CODE_EVALUATORS])(
      '%s: a miss is recorded but does not fail the dataset',
      async (name) => {
        const failures = await gate(evaluatorScoring({ name, score: 0 }));
        expect(failures).toHaveLength(1);
        expect(() => assertCodeScoresPass('dataset', failures)).not.toThrow();
      }
    );

    it.each([...PIPELINE_CODE_EVALUATORS])('%s: a miss fails the dataset', async (name) => {
      const failures = await gate(evaluatorScoring({ name, score: 0 }));
      expect(() => assertCodeScoresPass('dataset', failures)).toThrow(new RegExp(name));
    });

    describe('a MODEL_FAULT generation miss', () => {
      it.each([...MODEL_FAULT_CODE_EVALUATORS])('%s: is reported, not gated', async (name) => {
        const failures = await gate(evaluatorScoring({ name, score: 0, label: MODEL_FAULT_LABEL }));
        expect(failures).toHaveLength(1);
        expect(() => assertCodeScoresPass('dataset', failures)).not.toThrow();
      });

      it('ReviewsSettled: a refused review is reported, not gated', async () => {
        const failures = await gate(
          evaluatorScoring({ name: 'ReviewsSettled', score: 0, label: MODEL_FAULT_LABEL })
        );
        expect(failures).toHaveLength(1);
        expect(() => assertCodeScoresPass('dataset', failures)).not.toThrow();
      });

      it.each(['RunnerCompleted', 'FingerprintsDispatched', 'OutcomeReported', 'BrandNewCheck'])(
        '%s: still gates when it carries the label',
        async (name) => {
          const failures = await gate(
            evaluatorScoring({ name, score: 0, label: MODEL_FAULT_LABEL })
          );
          expect(() => assertCodeScoresPass('dataset', failures)).toThrow(new RegExp(name));
        }
      );

      it.each([...MODEL_FAULT_CODE_EVALUATORS])(
        '%s: still gates an unlabelled miss and a failed row',
        async (name) => {
          const unlabelled = await gate(evaluatorScoring({ name, score: 0 }));
          expect(() => assertCodeScoresPass('dataset', unlabelled)).toThrow(new RegExp(name));
          const rowFailed = await gate(
            evaluatorScoring({ name, score: null, label: ROW_FAILED_LABEL })
          );
          expect(() => assertCodeScoresPass('dataset', rowFailed)).toThrow(/ROW_FAILED/);
        }
      );
    });

    it('fails an evaluator nobody classified', async () => {
      const failures = await gate(evaluatorScoring({ name: 'BrandNewCheck', score: 0 }));
      expect(() => assertCodeScoresPass('dataset', failures)).toThrow(/BrandNewCheck/);
    });

    it('still fails a failed row reported by a quality evaluator', () => {
      const failures = [
        { evaluator: 'ForbiddenJoin', row: 'space: row-a', score: null, label: 'ROW_FAILED' },
      ];
      expect(() => assertCodeScoresPass('dataset', failures)).toThrow(/ROW_FAILED/);
    });

    it('lists only quality misses with the reported-not-gating heading', async () => {
      const warning = jest.fn();
      const log = { warning } as unknown as ToolingLog;
      const quality = await gate(evaluatorScoring({ name: 'VerdictMatchesGold', score: 0 }));
      const pipeline = await gate(evaluatorScoring({ name: 'RunnerCompleted', score: 0 }));
      logQualityMisses({ failures: [...quality, ...pipeline], datasetName: 'dataset', log });
      expect(warning).toHaveBeenCalledTimes(1);
      const message = warning.mock.calls[0][0] as string;
      expect(message).toContain('1 quality miss(es) (reported, not gating)');
      expect(message).toContain('VerdictMatchesGold');
      expect(message).not.toContain('RunnerCompleted');
    });

    it('logs nothing when there are no quality misses', () => {
      const warning = jest.fn();
      logQualityMisses({
        failures: [],
        datasetName: 'dataset',
        log: { warning } as unknown as ToolingLog,
      });
      expect(warning).not.toHaveBeenCalled();
    });
  });

  it('passes a fractional PositiveControlRecall that meets its threshold', async () => {
    const failures = await gate(
      evaluatorScoring({
        name: 'PositiveControlRecall',
        score: POSITIVE_CONTROL_RECALL_THRESHOLD,
        label: 'recalled',
      })
    );
    expect(failures).toEqual([]);
    expect(() => assertCodeScoresPass('dataset', failures)).not.toThrow();
  });

  it('records a PositiveControlRecall below its threshold as a quality miss', async () => {
    const failures = await gate(
      evaluatorScoring({ name: 'PositiveControlRecall', score: 0.5, label: 'missed' })
    );
    expect(failures).toHaveLength(1);
    expect(() => assertCodeScoresPass('dataset', failures)).not.toThrow();
  });

  it('summarises ROW_FAILED misses once per row instead of once per evaluator', () => {
    const failure = (evaluator: string, row: string) => ({
      evaluator,
      row,
      score: null,
      label: 'ROW_FAILED',
    });
    let message = '';
    try {
      assertCodeScoresPass('dataset', [
        failure('RunnerCompleted', 'space: row-a'),
        failure('NegativeControl', 'space: row-a'),
        failure('RunnerCompleted', 'space: row-b'),
        { evaluator: 'OutcomeReported', row: 'space: row-b', score: 0, label: 'wrong' },
      ]);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('4 CODE evaluator miss(es)');
    expect(message).toContain('space: row-a: 2 code evaluator(s) ROW_FAILED');
    expect(message).toContain('space: row-b: 1 code evaluator(s) ROW_FAILED');
    expect(message).toContain('OutcomeReported [space: row-b]: 0');
    expect(message).not.toContain('RunnerCompleted [');
  });

  it('still requires exactly 1 from evaluators without a threshold', async () => {
    const failures = await gate(evaluatorScoring({ name: 'OutcomeReported', score: 0.9 }));
    expect(failures).toHaveLength(1);
    expect(() => assertCodeScoresPass('dataset', failures)).toThrow(/OutcomeReported/);
  });

  it('keeps null as N/A when labelled N/A and as a miss otherwise', () => {
    expect(isCodeMiss({ evaluator: 'PositiveControlRecall', score: null, label: 'N/A' })).toBe(
      false
    );
    expect(isCodeMiss({ evaluator: 'PositiveControlRecall', score: null, label: 'MISSING' })).toBe(
      true
    );
    expect(isCodeMiss({ evaluator: 'NegativeControl', score: null })).toBe(true);
  });

  it('keeps an unjudgeable check (null score, no_citations) a miss, though the mean skips it', () => {
    expect(isCodeMiss({ evaluator: 'ForbiddenJoin', score: null, label: 'no_citations' })).toBe(
      true
    );
  });

  it('records every score, including a passing fractional one, for the run summary', async () => {
    const collector = createRunCollector();
    const [wrapped] = withScoreCollection(
      [evaluatorScoring({ name: 'PositiveControlRecall', score: 0.75, label: 'recalled' })],
      collector
    );
    await wrapped.evaluate(ROW);
    expect(collector.scores.get('PositiveControlRecall')).toEqual([0.75]);
  });

  describe('an evaluator that throws', () => {
    const throwing = (kind: 'CODE' | 'LLM'): WorkerEvaluator => ({
      name: kind === 'CODE' ? 'RunnerCompleted' : 'VerdictRationaleRubric',
      kind,
      direction: 'maximize',
      evaluate: async () => {
        throw new Error('Missing scores for criterion 2');
      },
    });

    it('never escapes: it becomes an EVALUATOR_FAILED null and is handed to the callback', async () => {
      const onError = jest.fn();
      const [wrapped] = withScoreCollection(
        [throwing('LLM')],
        createRunCollector(),
        undefined,
        onError
      );
      await expect(wrapped.evaluate(ROW)).resolves.toEqual({
        score: null,
        label: 'EVALUATOR_FAILED',
        explanation: 'Missing scores for criterion 2',
      });
      expect(onError).toHaveBeenCalledWith(ROW.input, 'VerdictRationaleRubric', expect.any(Error));
    });

    it('is a gated miss for a CODE evaluator', async () => {
      expect(await gate(throwing('CODE'))).toEqual([
        expect.objectContaining({
          evaluator: 'RunnerCompleted',
          score: null,
          label: 'EVALUATOR_FAILED',
        }),
      ]);
    });

    it('is not gated for a judge, and counts as unscored, never as a pass', async () => {
      const collector = createRunCollector();
      const [wrapped] = withScoreCollection([throwing('LLM')], collector);
      await wrapped.evaluate(ROW);
      expect(collector.codeFailures).toEqual([]);
      expect(collector.scores.get('VerdictRationaleRubric')).toEqual([null]);
      expect(computeScoreStats([null])).toMatchObject({ n: 0, naCount: 1 });
    });

    it('scores a CODE miss on a row with an undefined input without throwing', async () => {
      const collector = createRunCollector();
      const [wrapped] = withScoreCollection(
        [evaluatorScoring({ name: 'RunnerCompleted', score: null, label: 'ROW_FAILED' })],
        collector
      );
      await wrapped.evaluate({ ...ROW, input: undefined } as unknown as typeof ROW);
      expect(collector.codeFailures).toEqual([expect.objectContaining({ row: 'unknown row' })]);
    });
  });

  describe('describeRow', () => {
    it('names the space and scenario', () => {
      expect(describeRow({ spaceId: 's', scenarioId: 'x' })).toBe('s: x');
    });

    it('tolerates a missing or partial input', () => {
      expect(describeRow(undefined)).toBe('unknown row');
      expect(describeRow(null)).toBe('unknown row');
      expect(describeRow({})).toBe('unknown row');
      expect(describeRow({ scenarioId: 'x' })).toBe('?: x');
    });
  });

  it('does not gate LLM judges', async () => {
    expect(
      await gate(evaluatorScoring({ name: 'VerdictRationaleRubric', kind: 'LLM', score: 0 }))
    ).toEqual([]);
  });
});
