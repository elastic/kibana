/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFailError } from '@kbn/dev-cli-errors';
import { FlagsReader, getFlags } from '@kbn/dev-cli-runner';
import type { RunContext } from '@kbn/dev-cli-runner';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { ToolingLog } from '@kbn/tooling-log';
import {
  GATE_INCONCLUSIVE_EXIT_CODE,
  GATE_REGRESSION_EXIT_CODE,
  regressionGateCmd,
} from './regression_gate';

const mockEvalsClient = {
  assertPluginEnabled: jest.fn(),
  assertSpacesExist: jest.fn(),
  getExperimentScores: jest.fn(),
  findLatestExperimentForBuild: jest.fn(),
  findLatestBaselineExperiment: jest.fn(),
};
const mockMatrixEvalsClient = jest.fn(() => mockEvalsClient);

jest.mock('../../matrix/matrix_evals_client', () => ({
  MatrixEvalsClient: function MatrixEvalsClient(...args: unknown[]) {
    return mockMatrixEvalsClient(...(args as []));
  },
  createEvaluationsKbnClient: jest.fn(() => ({})),
  DEFAULT_EVALUATIONS_KBN_URL: 'http://localhost:5601',
}));
jest.mock('@kbn/evals', () => ({
  ...jest.requireActual('@kbn/evals'),
  resolveProfileEnvOverrides: jest.fn(async () => ({ profileEnvOverrides: {} })),
}));

const TARGET = 'target-exp';
const BASELINE = 'baseline-exp';
const PAIR_COUNT = 15;

const scoreDoc = (
  experimentId: string,
  exampleIndex: number,
  score: number,
  { datasetId = 'ds-1', evaluatorName = 'correctness', repetition = 0, totalRepetitions = 1 } = {}
): EvaluationScoreDocument => ({
  '@timestamp': '2026-05-01T11:00:00.000Z',
  experiment_id: experimentId,
  example: {
    id: `example-${exampleIndex}`,
    index: exampleIndex,
    input: {},
    dataset: { id: datasetId, name: 'Dataset One' },
  },
  task: {
    trace_id: null,
    repetition_index: repetition,
    output: {},
    model: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
  },
  evaluator: {
    name: evaluatorName,
    score,
    direction: 'maximize',
    model: { id: 'gpt-4o-mini', family: 'gpt', provider: 'openai' },
  },
  metadata: { execution_id: experimentId, total_repetitions: totalRepetitions },
});

const experiment = (experimentId: string, scoreAt: (index: number) => number) =>
  Array.from({ length: PAIR_COUNT }, (_, index) => scoreDoc(experimentId, index, scoreAt(index)));

const baselineScores = experiment(BASELINE, () => 0.8);
// Every pair drops: an exact Wilcoxon p of 2 / 2^15.
const regressedScores = experiment(TARGET, (index) => 0.4 - 0.01 * index);
// Alternating small moves with magnitudes 1..15: nowhere near significant.
const unchangedScores = experiment(
  TARGET,
  (index) => 0.8 + (index % 2 === 1 ? 1 : -1) * 0.01 * (index + 1)
);

const stubScores = (target: EvaluationScoreDocument[], baseline: EvaluationScoreDocument[]) => {
  mockEvalsClient.getExperimentScores.mockImplementation(async (experimentId: string) =>
    experimentId === TARGET ? target : baseline
  );
};

type Outcome = { exitCode: 0 } | { exitCode: number | undefined; error: Error };

const runGate = async (argv: string[]): Promise<Outcome> => {
  const flags = getFlags(argv, regressionGateCmd.flags);
  const flagsReader = new FlagsReader(flags);
  const log = new ToolingLog({ level: 'silent', writeTo: { write: () => {} } });
  try {
    await regressionGateCmd.run({ log, flags, flagsReader } as RunContext);
    return { exitCode: 0 };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { exitCode: isFailError(error) ? error.exitCode : undefined, error };
  }
};

describe('regressionGateCmd exit codes', () => {
  const env = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EVAL_KBN_URL;
    delete process.env.EVAL_KBN_API_KEY;
    delete process.env.EVAL_SPACE_IDS;
    mockEvalsClient.assertPluginEnabled.mockResolvedValue(undefined);
    mockEvalsClient.assertSpacesExist.mockResolvedValue(undefined);
    mockEvalsClient.findLatestExperimentForBuild.mockResolvedValue(undefined);
    mockEvalsClient.findLatestBaselineExperiment.mockResolvedValue(undefined);
    stubScores(unchangedScores, baselineScores);
  });

  afterAll(() => {
    process.env = env;
  });

  it('keeps the documented exit-code contract stable for CI callers', () => {
    expect(GATE_INCONCLUSIVE_EXIT_CODE).toBe(2);
    expect(GATE_REGRESSION_EXIT_CODE).toBe(3);
  });

  it('exits 0 when the gate checked evaluators and found no regression', async () => {
    expect(await runGate([TARGET, BASELINE])).toEqual({ exitCode: 0 });
  });

  it(`exits ${GATE_REGRESSION_EXIT_CODE} on a significant regression`, async () => {
    stubScores(regressedScores, baselineScores);

    const outcome = await runGate([TARGET, BASELINE]);

    expect(outcome.exitCode).toBe(GATE_REGRESSION_EXIT_CODE);
    expect('error' in outcome && outcome.error.message).toContain('Regression gate tripped');
  });

  it.each(['10abc', '0', '-1', '1.5', '9007199254740993'])(
    'rejects --min-pairs %s',
    async (value) => {
      const outcome = await runGate([TARGET, BASELINE, `--min-pairs=${value}`]);
      expect(outcome.exitCode).toBe(1);
      expect('error' in outcome && outcome.error.message).toContain(
        '--min-pairs must be a positive integer.'
      );
    }
  );

  // The runner exits 1 for any error without its own exit code.
  const processExitCode = (outcome: Outcome) => outcome.exitCode ?? 1;

  it('exits 1, not inconclusive, when a score read fails', async () => {
    mockEvalsClient.getExperimentScores.mockRejectedValue(new Error('socket hang up'));

    const outcome = await runGate([TARGET, BASELINE]);

    expect(processExitCode(outcome)).toBe(1);
    expect('error' in outcome && outcome.error.message).toContain('socket hang up');
  });

  it('rejects a missing experiment ID', async () => {
    const outcome = await runGate([TARGET]);
    expect('error' in outcome && outcome.error.message).toContain(
      'Two experiment IDs are required'
    );
  });

  it('reads scores with throwOnError', async () => {
    await runGate([TARGET, BASELINE]);
    expect(mockEvalsClient.getExperimentScores).toHaveBeenCalledWith(TARGET, undefined, {
      throwOnError: true,
    });
  });

  it(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} when no evaluator has enough pairs`, async () => {
    stubScores(regressedScores, baselineScores);

    const outcome = await runGate([TARGET, BASELINE, '--min-pairs', String(PAIR_COUNT + 1)]);

    expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
    expect('error' in outcome && outcome.error.message).toContain('inconclusive');
  });

  it(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} when --regression-evaluators matches nothing`, async () => {
    stubScores(regressedScores, baselineScores);

    const outcome = await runGate([TARGET, BASELINE, '--regression-evaluators', 'typo']);

    expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
    expect('error' in outcome && outcome.error.message).toContain('Available: correctness');
  });

  it('only gates the evaluators in --regression-evaluators', async () => {
    stubScores(
      [
        ...regressedScores,
        ...experiment(TARGET, () => 0.5).map((doc) => ({
          ...doc,
          evaluator: { ...doc.evaluator, name: 'groundedness' },
        })),
      ],
      [
        ...baselineScores,
        ...experiment(BASELINE, () => 0.5).map((doc) => ({
          ...doc,
          evaluator: { ...doc.evaluator, name: 'groundedness' },
        })),
      ]
    );

    const outcome = await runGate([
      TARGET,
      BASELINE,
      '--regression-evaluators',
      'groundedness,missing',
    ]);

    // groundedness has only zero differences, so no usable p-value: nothing checked.
    expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
  });

  it('judges the gate on raw p-values with --no-multiplicity-correction', async () => {
    // Six drops: exact Wilcoxon p = 2 / 2^6 ~ 0.031, which Holm doubles past 0.05 next to a
    // second, unchanged evaluator. 2 / 2^6 is also the floor at six pairs, so under Holm neither
    // row could reach significance: inconclusive, not passed.
    const sixPairs = (
      experimentId: string,
      evaluatorName: string,
      scoreAt: (i: number) => number
    ) =>
      Array.from({ length: 6 }, (_, index) =>
        scoreDoc(experimentId, index, scoreAt(index), { evaluatorName })
      );
    stubScores(
      [
        ...sixPairs(TARGET, 'correctness', (index) => 0.4 - 0.01 * index),
        ...sixPairs(
          TARGET,
          'groundedness',
          (index) => 0.8 + (index % 2 ? 1 : -1) * 0.01 * (index + 1)
        ),
      ],
      [
        ...sixPairs(BASELINE, 'correctness', () => 0.8),
        ...sixPairs(BASELINE, 'groundedness', () => 0.8),
      ]
    );
    const argv = [TARGET, BASELINE, '--min-pairs', '5'];

    const corrected = await runGate(argv);
    expect(corrected.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
    expect('error' in corrected && corrected.error.message).toContain('underpowered (n=6');
    expect((await runGate([...argv, '--no-multiplicity-correction'])).exitCode).toBe(
      GATE_REGRESSION_EXIT_CODE
    );
  });

  it('counts examples, not repetitions, towards --min-pairs', async () => {
    // 5 examples x 3 repetitions: 15 docs per side, but only 5 independent pairs.
    const repeated = (experimentId: string, scoreAt: (example: number) => number) =>
      [0, 1, 2, 3, 4].flatMap((example) =>
        [0, 1, 2].map((repetition) =>
          scoreDoc(experimentId, example, scoreAt(example), { repetition, totalRepetitions: 3 })
        )
      );
    stubScores(
      repeated(TARGET, (example) => 0.4 - 0.01 * example),
      repeated(BASELINE, () => 0.8)
    );

    const outcome = await runGate([TARGET, BASELINE, '--min-pairs', '10']);

    expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
    expect('error' in outcome && outcome.error.message).toContain('inconclusive');
  });

  it('does not read 3 repetitions against 1 as a regression when the shared repetition is unchanged', async () => {
    // Repetition 0 matches the baseline everywhere; only the extra target repetitions fail. The
    // target means drop on every example, but the baseline never ran those repetitions.
    const target = Array.from({ length: PAIR_COUNT }, (_, example) =>
      [1, 0, 0].map((score, repetition) =>
        scoreDoc(TARGET, example, score, { repetition, totalRepetitions: 3 })
      )
    ).flat();
    stubScores(
      target,
      experiment(BASELINE, () => 1)
    );

    // Averaging all 3 target repetitions would give 1/3 against 1 on every example and trip.
    // Pass/fail scores go to McNemar, which gives p = 1 with no discordant pairs: checked, passed.
    expect(await runGate([TARGET, BASELINE])).toEqual({ exitCode: 0 });
  });

  it('ranks averaged repetitions with exact ties, as the pass counts they came from', async () => {
    // Pass counts out of 3 repetitions per example. Averaged into thirds, roundoff splits tied
    // differences and Wilcoxon gives p ~ 0.031; the counts themselves give p ~ 0.055.
    const passCounts = (experimentId: string, digits: string) =>
      [...digits].flatMap((count, example) =>
        [0, 1, 2].map((repetition) =>
          scoreDoc(experimentId, example, repetition < Number(count) ? 1 : 0, {
            repetition,
            totalRepetitions: 3,
          })
        )
      );
    stubScores(passCounts(TARGET, '012102111210221'), passCounts(BASELINE, '112231133313310'));

    expect(await runGate([TARGET, BASELINE])).toEqual({ exitCode: 0 });
  });

  describe('--baseline-branch', () => {
    const SUITE = 'suite-1';
    const TARGET_COMPOSITE = `${TARGET}::${SUITE}::model-a`;

    it('requires --suite', async () => {
      const outcome = await runGate([TARGET, '--baseline-branch', 'main']);
      expect('error' in outcome && outcome.error.message).toContain('--suite is required');
    });

    it('requires exactly one experiment ID', async () => {
      const outcome = await runGate([
        TARGET,
        BASELINE,
        '--baseline-branch',
        'main',
        '--suite',
        SUITE,
      ]);
      expect('error' in outcome && outcome.error.message).toContain(
        'One experiment ID is required'
      );
    });

    it('resolves the baseline by branch, matching the target model, and gates on it', async () => {
      mockEvalsClient.findLatestBaselineExperiment.mockResolvedValue({ executionId: BASELINE });
      stubScores(regressedScores, baselineScores);
      mockEvalsClient.getExperimentScores.mockImplementation(async (experimentId: string) =>
        experimentId === TARGET_COMPOSITE ? regressedScores : baselineScores
      );

      const outcome = await runGate([
        TARGET_COMPOSITE,
        '--baseline-branch',
        'main',
        '--suite',
        SUITE,
      ]);

      expect(outcome.exitCode).toBe(GATE_REGRESSION_EXIT_CODE);
      expect(mockEvalsClient.findLatestBaselineExperiment).toHaveBeenCalledWith({
        suiteId: SUITE,
        branch: 'main',
        taskModelId: 'model-a',
        excludeExecutionId: TARGET_COMPOSITE,
        throwOnError: true,
      });
      expect(mockEvalsClient.getExperimentScores).toHaveBeenCalledWith(
        BASELINE,
        { suiteId: SUITE, executionId: BASELINE },
        { throwOnError: true }
      );
    });

    it('resolves a base build ID to its composite execution ID', async () => {
      mockEvalsClient.findLatestExperimentForBuild.mockResolvedValue({
        executionId: TARGET_COMPOSITE,
      });
      mockEvalsClient.findLatestBaselineExperiment.mockResolvedValue({ executionId: BASELINE });
      mockEvalsClient.getExperimentScores.mockImplementation(async (experimentId: string) =>
        experimentId === TARGET_COMPOSITE ? unchangedScores : baselineScores
      );

      await runGate(['bk-123', '--baseline-branch', 'main', '--suite', SUITE]);

      expect(mockEvalsClient.findLatestExperimentForBuild).toHaveBeenCalledWith({
        suiteId: SUITE,
        baseExecutionId: 'bk-123',
        throwOnError: true,
      });
      expect(mockEvalsClient.getExperimentScores).toHaveBeenCalledWith(
        TARGET_COMPOSITE,
        { suiteId: SUITE, executionId: TARGET_COMPOSITE },
        { throwOnError: true }
      );
    });

    it(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} without reading scores when no baseline exists`, async () => {
      const outcome = await runGate([
        TARGET_COMPOSITE,
        '--baseline-branch',
        'main',
        '--suite',
        SUITE,
      ]);

      expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
      expect('error' in outcome && outcome.error.message).toContain('No baseline experiment found');
      expect(mockEvalsClient.getExperimentScores).not.toHaveBeenCalled();
    });

    it(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} without reading scores when a build ID does not resolve`, async () => {
      const outcome = await runGate(['bk-123', '--baseline-branch', 'main', '--suite', SUITE]);

      expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
      expect('error' in outcome && outcome.error.message).toContain(
        'Could not resolve build ID "bk-123"'
      );
      expect(mockEvalsClient.findLatestBaselineExperiment).not.toHaveBeenCalled();
      expect(mockEvalsClient.getExperimentScores).not.toHaveBeenCalled();
    });

    it(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} when a positional build ID does not resolve`, async () => {
      const outcome = await runGate(['bk-1', 'bk-2', '--suite', SUITE]);

      expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
      expect('error' in outcome && outcome.error.message).toContain('Could not resolve build ID');
      expect(mockEvalsClient.getExperimentScores).not.toHaveBeenCalled();
    });

    it.each([
      [
        'the baseline lookup',
        () =>
          mockEvalsClient.findLatestBaselineExperiment.mockRejectedValue(new Error('lookup down')),
        [TARGET_COMPOSITE, '--baseline-branch', 'main', '--suite', SUITE],
      ],
      [
        'the build ID lookup',
        () =>
          mockEvalsClient.findLatestExperimentForBuild.mockRejectedValue(new Error('lookup down')),
        ['bk-123', '--baseline-branch', 'main', '--suite', SUITE],
      ],
    ])('exits 1, not inconclusive, when %s fails', async (_label, arrange, argv) => {
      arrange();

      const outcome = await runGate(argv);

      expect(processExitCode(outcome)).toBe(1);
      expect('error' in outcome && outcome.error.message).toContain('lookup down');
    });
  });

  describe('--space-ids', () => {
    it('passes --space-ids to the client and checks the spaces exist', async () => {
      await runGate([TARGET, BASELINE, '--space-ids', 'a, b']);

      expect(mockMatrixEvalsClient).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        spaceIds: ['a', 'b'],
      });
      expect(mockEvalsClient.assertSpacesExist).toHaveBeenCalled();
    });

    it('falls back to EVAL_SPACE_IDS', async () => {
      process.env.EVAL_SPACE_IDS = 'sec';

      await runGate([TARGET, BASELINE]);

      expect(mockMatrixEvalsClient).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        spaceIds: ['sec'],
      });
    });

    it('rejects the all-spaces wildcard', async () => {
      const outcome = await runGate([TARGET, BASELINE, '--space-ids', '*']);
      expect('error' in outcome && outcome.error.message).toContain('does not accept');
    });

    it('turns a missing space into a usage error', async () => {
      mockEvalsClient.assertSpacesExist.mockRejectedValue(new Error('space "x" not found'));
      const outcome = await runGate([TARGET, BASELINE, '--space-ids', 'x']);
      expect(outcome.exitCode).toBe(1);
      expect('error' in outcome && outcome.error.message).toContain('not found');
    });
  });

  describe('nothing to compare', () => {
    it.each([
      ['the target has no scores', () => stubScores([], baselineScores)],
      ['the baseline has no scores', () => stubScores(regressedScores, [])],
      [
        'no dataset overlaps',
        () =>
          stubScores(
            regressedScores.map((doc) => ({
              ...doc,
              example: { ...doc.example, dataset: { id: 'other', name: 'Other' } },
            })),
            baselineScores
          ),
      ],
      [
        'no example pairs up',
        () =>
          stubScores(
            regressedScores.map((doc) => ({
              ...doc,
              example: { ...doc.example, id: `${doc.example.id}-renamed` },
            })),
            baselineScores
          ),
      ],
    ])(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} when %s`, async (_label, arrange) => {
      arrange();

      const outcome = await runGate([TARGET, BASELINE]);
      expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
      expect('error' in outcome && outcome.error.message).toContain(
        'Regression gate was NOT evaluated'
      );
    });
  });
});
