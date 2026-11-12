/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import type { Command, RunContext } from '@kbn/dev-cli-runner';
import {
  getSpaceIdsFromEnv,
  readSpaceIdsFlag,
  resolveProfileEnvOverrides,
  type BaselineExperiment,
} from '@kbn/evals';
import {
  applyHolmCorrection,
  attachEffectSigns,
  averageMatchedRepetitions,
  compareScores,
  pairScores,
  retestWilcoxonWithExactTies,
} from '@kbn/evals-common';
import {
  DEFAULT_EVALUATIONS_KBN_URL,
  MatrixEvalsClient,
  createEvaluationsKbnClient,
} from '../../matrix/matrix_evals_client';
import {
  DEFAULT_REGRESSION_MIN_PAIRS,
  evaluateRegressionGate,
  formatRegressionGateReport,
} from '../../matrix/regression_gate';
import { sanitizeKbnUrlForLog } from './matrix';

// Exit 1 stays with usage and unexpected errors (including ones the CLI runner raises before this
// command runs), so a regression needs a code of its own.
export const GATE_INCONCLUSIVE_EXIT_CODE = 2;
export const GATE_REGRESSION_EXIT_CODE = 3;

export const regressionGateCmd = {
  name: 'regression-gate',
  description: `
  Compare two evaluation experiments and exit non-zero when an evaluator got
  significantly worse (direction-aware; higher-is-better and lower-is-better
  evaluators are both handled, neutral ones never trip).

  Usage:
    node x-pack/solutions/security/packages/kbn-security-evals-matrix/scripts/run_cli.cjs regression-gate \\
      <target-experiment-id> <baseline-experiment-id>
    node x-pack/solutions/security/packages/kbn-security-evals-matrix/scripts/run_cli.cjs regression-gate \\
      <target-experiment-id> --baseline-branch main --suite <suite-id>

  Options:
    --baseline-branch           Branch to find the latest baseline experiment on
                                (e.g. "main"). Requires --suite and exactly one
                                experiment ID.
    --suite                     Suite ID. Resolves base build IDs (no "::") to
                                full experiment IDs and scopes score reads.
    --space-ids                 Spaces the experiments were run in (same value as
                                "evals run"); defaults to EVAL_SPACE_IDS.
    --min-pairs                 Minimum paired examples for an evaluator to be
                                gated (default: ${DEFAULT_REGRESSION_MIN_PAIRS}). Fewer pairs are
                                reported as "insufficient pairs" and cannot trip
                                the gate.
    --regression-evaluators     Comma-separated evaluator names that can trip the
                                gate (default: all). Names absent from the
                                comparison warn; if none match, the run fails.
    --no-multiplicity-correction
                                Judge significance on raw p-values. Holm-
                                Bonferroni adjustment across all comparisons in
                                the run is on by default.

  Exit codes:
    0  passed — no evaluator got significantly worse
    1  usage error or unexpected error
    2  inconclusive — no baseline, no scores or pairs, nothing checkable, or no
       evaluator matched: regressions can be neither confirmed nor ruled out
    3  significant regression

  Environment:
    EVAL_KBN_URL      Target Kibana URL (defaults to localhost)
    EVAL_KBN_API_KEY  API key for authenticating to the target Kibana
    EVAL_SPACE_IDS    Spaces the experiments were run in (same as --space-ids)
    (or --profile / --kbn-url / --kbn-api-key, as for the matrix command)
  `,
  flags: {
    string: [
      'profile',
      'kbn-url',
      'kbn-api-key',
      'regression-evaluators',
      'min-pairs',
      'baseline-branch',
      'suite',
      'space-ids',
    ],
    boolean: ['multiplicity-correction'],
    default: { 'multiplicity-correction': true },
    allowUnexpected: false,
    help: `
    --baseline-branch              Branch to find the latest baseline experiment on
    --suite                        Suite ID (required with --baseline-branch)
    --space-ids                    Spaces the experiments were run in
    --min-pairs                    Minimum paired examples for an evaluator to be gated
                                   (default: ${DEFAULT_REGRESSION_MIN_PAIRS})
    --regression-evaluators        Comma-separated evaluator names that can trip the gate (default: all)
    --multiplicity-correction      Holm-Bonferroni adjust p-values across the run (default: on)
    --no-multiplicity-correction   Judge significance on raw p-values
    --profile                      Golden-cluster config profile providing EVAL_KBN_URL/API_KEY
    --kbn-url                      Kibana URL override.
    --kbn-api-key                  Kibana API key override.
    `,
  },
  run: async ({ log, flags, flagsReader }: RunContext) => {
    const positionals = flagsReader.getPositionals();
    const baselineBranch = flagsReader.string('baseline-branch');
    const suiteId = flagsReader.string('suite');
    // Scores are only readable from the spaces they were ingested into, so the gate has to read
    // from where the runs put them.
    const spaceIds = readSpaceIdsFlag(flagsReader) ?? getSpaceIdsFromEnv();

    if (baselineBranch) {
      if (!suiteId) {
        throw createFlagError('--suite is required when using --baseline-branch.');
      }
      if (positionals.length !== 1) {
        throw createFlagError(
          'One experiment ID is required with --baseline-branch. Example: node x-pack/solutions/security/packages/kbn-security-evals-matrix/scripts/run_cli.cjs regression-gate <experiment-id> --baseline-branch main --suite <suite-id>'
        );
      }
    } else {
      if (positionals.length < 2) {
        throw createFlagError(
          'Two experiment IDs are required (target first, baseline second). Example: node x-pack/solutions/security/packages/kbn-security-evals-matrix/scripts/run_cli.cjs regression-gate <target-experiment-id> <baseline-experiment-id>'
        );
      }
      if (positionals.length > 2) {
        throw createFlagError('Unexpected extra arguments. Provide exactly two experiment IDs.');
      }
    }

    const rawMinPairs = flagsReader.string('min-pairs');
    // FlagsReader.number uses parseFloat, which would accept "10abc".
    if (rawMinPairs !== undefined && !/^\s*\d+\s*$/.test(rawMinPairs)) {
      throw createFlagError('--min-pairs must be a positive integer.');
    }
    const minPairs =
      rawMinPairs === undefined ? DEFAULT_REGRESSION_MIN_PAIRS : Number(rawMinPairs.trim());
    if (minPairs < 1 || !Number.isSafeInteger(minPairs)) {
      throw createFlagError('--min-pairs must be a positive integer.');
    }

    const rawRegressionEvaluators = flagsReader.string('regression-evaluators');
    const regressionEvaluators = rawRegressionEvaluators
      ?.split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    if (rawRegressionEvaluators !== undefined && regressionEvaluators?.length === 0) {
      throw createFlagError('--regression-evaluators must list at least one evaluator name.');
    }

    const multiplicityCorrection =
      typeof flags['multiplicity-correction'] === 'boolean'
        ? flags['multiplicity-correction']
        : true;

    const profile = flagsReader.string('profile') ?? undefined;
    const { profileEnvOverrides: profileEnv } = await resolveProfileEnvOverrides({
      repoRoot: process.cwd(),
      log,
      flagsReader,
      profile,
    });
    const evaluationsKbnUrl =
      flagsReader.string('kbn-url') ?? profileEnv.EVAL_KBN_URL ?? process.env.EVAL_KBN_URL;
    if (!evaluationsKbnUrl) {
      log.warning(
        `EVAL_KBN_URL not set; defaulting to ${sanitizeKbnUrlForLog(DEFAULT_EVALUATIONS_KBN_URL)}.`
      );
    }
    const evaluationsKbnApiKey =
      flagsReader.string('kbn-api-key') ??
      profileEnv.EVAL_KBN_API_KEY ??
      process.env.EVAL_KBN_API_KEY;

    const kbnClient = createEvaluationsKbnClient({
      log,
      url: evaluationsKbnUrl,
      apiKey: evaluationsKbnApiKey,
    });
    const evalsClient = new MatrixEvalsClient(kbnClient, log, { spaceIds });

    try {
      await evalsClient.assertPluginEnabled();
    } catch (error) {
      throw createFlagError(
        [
          error instanceof Error ? error.message : String(error),
          'Set EVAL_KBN_URL to a Kibana instance with xpack.evals.enabled=true and xpack.evals.mode=full.',
          'Set EVAL_KBN_API_KEY when authenticating to a non-local target.',
        ].join('\n')
      );
    }

    try {
      await evalsClient.assertSpacesExist();
    } catch (error) {
      throw createFlagError(error instanceof Error ? error.message : String(error));
    }

    log.info(
      `Reading gate scores from ${sanitizeKbnUrlForLog(
        evaluationsKbnUrl ?? DEFAULT_EVALUATIONS_KBN_URL
      )}`
    );

    // "Nothing to compare" means the gate was not evaluated, which must not look like a clean
    // pass in CI.
    const nothingToCompare = (message: string): Error =>
      createFailError(`${message} Regression gate was NOT evaluated.`, {
        exitCode: GATE_INCONCLUSIVE_EXIT_CODE,
      });

    // A build ID with no experiment for this suite means the suite produced nothing to grade.
    const unresolvedBuildId = (id: string, suite: string): Error =>
      nothingToCompare(`Could not resolve build ID "${id}" to an experiment for suite ${suite}.`);

    // A failed read has to stay an error (exit 1): read as "no baseline" or "no scores" it would
    // turn an outage into an inconclusive gate.
    const readOptions = { throwOnError: true };

    let targetExperimentId: string;
    let baselineExperimentId: string;

    if (baselineBranch && suiteId) {
      [targetExperimentId] = positionals;

      // In CI the positional may be a base build ID (e.g. "bk-BUILD_ID"). Resolve it to the full
      // composite ("bk-BUILD_ID::suite::model") so the server's exact-term query on
      // metadata.execution_id finds the scores.
      if (!targetExperimentId.includes('::')) {
        const resolved = await evalsClient.findLatestExperimentForBuild({
          suiteId,
          baseExecutionId: targetExperimentId,
          ...readOptions,
        });
        if (!resolved) throw unresolvedBuildId(targetExperimentId, suiteId);
        log.info(`Resolved PR experiment: ${targetExperimentId} → ${resolved.executionId}`);
        targetExperimentId = resolved.executionId;
      }

      // Match the baseline to the target's model so one model is never gated against another.
      const taskModelId = targetExperimentId.includes('::')
        ? targetExperimentId.split('::').pop()
        : undefined;

      log.info(
        `Looking up latest baseline experiment for suite "${suiteId}" on branch "${baselineBranch}"${
          taskModelId ? ` (model: ${taskModelId})` : ''
        }...`
      );
      const baselineMetadata: BaselineExperiment | undefined =
        await evalsClient.findLatestBaselineExperiment({
          suiteId,
          branch: baselineBranch,
          taskModelId,
          excludeExecutionId: targetExperimentId,
          ...readOptions,
        });
      if (!baselineMetadata) {
        throw nothingToCompare(
          `No baseline experiment found for suite ${suiteId} on branch ${baselineBranch}. Nothing to compare.`
        );
      }
      baselineExperimentId = baselineMetadata.executionId;
      log.info(`Found baseline experiment: ${baselineExperimentId}`);
    } else {
      [targetExperimentId, baselineExperimentId] = positionals;

      // With --suite, a positional without "::" is a base build ID: resolve it to the composite
      // execution ID. Build IDs are globally unique, so no branch filter is needed.
      if (suiteId) {
        const resolveIfNeeded = async (id: string): Promise<string> => {
          if (id.includes('::')) return id;
          const resolved = await evalsClient.findLatestExperimentForBuild({
            suiteId,
            baseExecutionId: id,
            ...readOptions,
          });
          if (!resolved) throw unresolvedBuildId(id, suiteId);
          log.info(`Resolved experiment ${id} → ${resolved.executionId}`);
          return resolved.executionId;
        };
        [targetExperimentId, baselineExperimentId] = await Promise.all([
          resolveIfNeeded(targetExperimentId),
          resolveIfNeeded(baselineExperimentId),
        ]);
      }
    }

    const targetFilter = suiteId ? { suiteId, executionId: targetExperimentId } : undefined;
    const baselineFilter = suiteId ? { suiteId, executionId: baselineExperimentId } : undefined;
    const [targetExperimentScores, baselineExperimentScores] = await Promise.all([
      evalsClient.getExperimentScores(targetExperimentId, targetFilter, readOptions),
      evalsClient.getExperimentScores(baselineExperimentId, baselineFilter, readOptions),
    ]);

    if (targetExperimentScores.length === 0) {
      throw nothingToCompare(`No scores found for experiment ID: ${targetExperimentId}`);
    }
    if (baselineExperimentScores.length === 0) {
      throw nothingToCompare(`No scores found for experiment ID: ${baselineExperimentId}`);
    }

    const targetExperimentDatasets = new Map(
      targetExperimentScores.map((score) => [score.example.dataset.id, score.example.dataset.name])
    );
    const baselineExperimentDatasets = new Map(
      baselineExperimentScores.map((score) => [
        score.example.dataset.id,
        score.example.dataset.name,
      ])
    );
    const overlappingDatasetIds = [...targetExperimentDatasets.keys()].filter((id) =>
      baselineExperimentDatasets.has(id)
    );
    if (overlappingDatasetIds.length === 0) {
      throw nothingToCompare('No overlapping datasets found between the two experiments.');
    }
    log.info(`Found ${overlappingDatasetIds.length} overlapping dataset(s).`);

    const overlappingDatasetSet = new Set(overlappingDatasetIds);
    const filteredTargetScores = targetExperimentScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );
    const filteredBaselineScores = baselineExperimentScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );

    // The gate pairs per example, not per repetition: repetitions of one example are not
    // independent, and counting them as pairs would inflate n for --min-pairs and shrink every
    // p-value.
    const averaged = averageMatchedRepetitions(filteredTargetScores, filteredBaselineScores);
    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
      averaged.target,
      averaged.baseline
    );
    if (pairs.length === 0) {
      throw nothingToCompare('No paired scores found between the two experiments.');
    }
    log.info(
      `Paired ${pairs.length} example scores, repetitions averaged (skipped ${skippedMissingPairs} missing pairs, ${skippedNullScores} null scores).`
    );
    if (averaged.trimmedExamples > 0) {
      log.warning(
        `${averaged.trimmedExamples} example/evaluator score(s) had a different number of usable repetitions in the two runs; each was averaged over the count both runs have.`
      );
    }

    // Averaged repetitions are fractions like 1/3 whose differences tie only up to roundoff, so
    // the Wilcoxon rows are re-run with exact ties, as the pass counts they came from.
    const comparisonResults = retestWilcoxonWithExactTies(compareScores(pairs), pairs);
    if (comparisonResults.length === 0) {
      throw nothingToCompare('No comparison results returned.');
    }

    if (regressionEvaluators) {
      const known = new Set(comparisonResults.map((result) => result.evaluatorName));
      const unknown = regressionEvaluators.filter((name) => !known.has(name));
      if (unknown.length === regressionEvaluators.length) {
        // Every name missing means the gate would check nothing and pass vacuously. The flag is
        // well-formed, so this is a mismatch with the data (often a typo or the wrong suite).
        throw createFailError(
          `--regression-evaluators matches no evaluator in this comparison. Available: ${[...known]
            .sort()
            .join(', ')}`,
          { exitCode: GATE_INCONCLUSIVE_EXIT_CODE }
        );
      }
      if (unknown.length > 0) {
        // Partial mismatch is only a warning: one list may be shared across suites with different evaluators.
        log.warning(
          `--regression-evaluators names evaluator(s) not present in this comparison: ${unknown.join(
            ', '
          )}. Available: ${[...known].sort().join(', ')}`
        );
      }
    }

    // Holm runs over every comparison in this run (all datasets x evaluators); gate scoping does
    // not shrink the family: the gate is judged on the same adjusted p-values a report would print.
    const results = attachEffectSigns(
      multiplicityCorrection ? applyHolmCorrection(comparisonResults) : comparisonResults,
      pairs
    );

    const decision = evaluateRegressionGate({
      results,
      minPairs,
      evaluators: regressionEvaluators,
    });
    const gateReport = formatRegressionGateReport({ decision, minPairs });

    if (decision.status === 'tripped') {
      throw createFailError(gateReport, { exitCode: GATE_REGRESSION_EXIT_CODE });
    }
    if (decision.status === 'inconclusive') {
      throw createFailError(gateReport, { exitCode: GATE_INCONCLUSIVE_EXIT_CODE });
    }
    log.info(gateReport);
  },
} satisfies Command<void>;
