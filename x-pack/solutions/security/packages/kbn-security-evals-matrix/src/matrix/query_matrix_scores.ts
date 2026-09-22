/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvaluationExperimentSummary, EvaluationScoreDocument } from '@kbn/evals-common';
import type { ExperimentStats } from '@kbn/evals';
import { MAX_LIST_EXPERIMENTS, type MatrixEvalsClient } from './matrix_evals_client';
import { mergeShardDatasets, pickShardExperiments } from './merge_shard_experiments';
import { isEisBacked, describeJudge } from './judge_provenance';
import { resolveVerdictScore } from './scoring_policy';

/** Counts of score documents dropped by the provenance/verdict policy. */
export interface ExcludedScoreCounts {
  /** Dropped because evaluator.direction is minimize/neutral, not a quality score. */
  nonQuality: number;
  nonEis: number;
  selfJudged: number;
  unmappedVerdict: number;
}

export interface ScoreAggregationOptions {
  /** Drop scores from judges that are not EIS-backed connectors. */
  requireEisJudge?: boolean;
  /** Drop scores where the judge and the graded model are the same id. */
  excludeSelfJudged?: boolean;
  /** Score the judge's categorical verdict via an ordinal ladder instead of its continuous value. */
  useVerdictLadder?: boolean;
  onExcluded?: (counts: ExcludedScoreCounts) => void;
}

/** Aggregated evaluator score for a single dataset within a suite. */
export interface AggregatedEvaluatorScore {
  evaluatorName: string;
  mean: number;
  count: number;
  /** Observed spread across the experiment's examples (used by the token axis). */
  min?: number;
  max?: number;
}

export interface AggregatedDatasetScores {
  datasetId: string;
  datasetName: string;
  evaluators: AggregatedEvaluatorScore[];
  /** Evaluators that produced `label=error`/`unavailable` docs and no numeric score. */
  erroredOutEvaluators?: string[];
}

export interface AggregatedSuiteScores {
  suiteId: string;
  experimentId: string;
  /** Every (experimentId, executionId) contributing to this row; sharded sweeps have one per VM. */
  executions?: Array<{ experimentId: string; executionId: string }>;
  /** Flat execution IDs for backwards compatibility / display. */
  executionIds?: string[];
  timestamp?: string;
  /** Commit the graded run executed against (not the generator's commit). */
  commitSha?: string;
  /** True when the admitted scores were graded by the model being graded. */
  selfJudged?: boolean;
  /** Judge that graded this run; undefined when more than one judge did (see `judgeModelIds`). */
  judgeModelId?: string;
  /** Every judge that graded this suite's admitted runs. */
  judgeModelIds?: string[];
  /** Scores withheld for self-judging; set only when the withholding emptied the suite. */
  excludedSelfJudged?: number;
  datasets: AggregatedDatasetScores[];
}

export interface AggregatedModelScores {
  modelId: string;
  family?: string;
  provider?: string;
  suites: AggregatedSuiteScores[];
  /** Scores rejected by judge policy; present only when at least one was dropped. */
  excluded?: ExcludedScoreCounts;
}

export interface QueryMatrixScoresOptions {
  suiteIds: string[];
  /** Task model ids to include (the config's `id` + `matchIds` per model). */
  modelIds: string[];
  branch?: string;
  /** Per-suite branch overrides, keyed by suite id. */
  branchBySuite?: Record<string, string | string[]>;
  lookbackDays?: number;
  /** Epoch-ms instant to render the matrix as of; newer experiments are ignored for every model. */
  asOf?: number;
  /** Example-id prefixes per suite, bucketed into synthetic per-prefix datasets. */
  prefixesBySuite?: Record<string, string[]>;
  /** Judged-evaluator scoring policy for the per-prefix datasets. */
  scoring?: ScoreAggregationOptions;
  /** Per-suite scoring overrides, keyed by suite id. */
  scoringBySuite?: Record<string, ScoreAggregationOptions>;
}

/** Buckets per-example score documents into synthetic per-prefix datasets with per-evaluator means. */
export const scoresByPrefixToDatasets = (
  scores: EvaluationScoreDocument[],
  prefixes: string[],
  options: ScoreAggregationOptions = {}
): AggregatedDatasetScores[] => {
  const byPrefix = new Map<string, Map<string, { sum: number; count: number }>>();
  const erroredByPrefix = new Map<string, Map<string, { errored: number; scored: number }>>();
  const excluded: ExcludedScoreCounts = {
    nonQuality: 0,
    nonEis: 0,
    selfJudged: 0,
    unmappedVerdict: 0,
  };

  for (const doc of scores) {
    const exampleId = doc.example?.id ?? '';
    const prefix = prefixes.find((p) => exampleId === p || exampleId.startsWith(`${p}-`));
    if (prefix) {
      const evaluatorName = doc.evaluator?.name;
      const direction = (doc.evaluator as { direction?: string } | undefined)?.direction;
      if (evaluatorName) {
        const judgeId = doc.evaluator?.model?.id;
        const taskModelId = doc.task?.model?.id;
        const rejectedEisJudge = options.requireEisJudge && judgeId && !isEisBacked(judgeId);
        if (rejectedEisJudge) {
          excluded.nonEis += 1;
        }
        const rejectedSelfJudged =
          !rejectedEisJudge &&
          options.excludeSelfJudged &&
          judgeId &&
          taskModelId &&
          describeJudge(judgeId, taskModelId).selfJudged;
        if (rejectedSelfJudged) {
          excluded.selfJudged += 1;
        }

        // Only maximize-direction evaluators are quality scores.
        const rejectedNonQuality =
          !rejectedEisJudge && !rejectedSelfJudged && direction && direction !== 'maximize';
        if (rejectedNonQuality) {
          excluded.nonQuality += 1;
        }

        if (!rejectedEisJudge && !rejectedSelfJudged && !rejectedNonQuality) {
          const score = options.useVerdictLadder
            ? resolveVerdictScore(evaluatorName, doc)
            : doc.evaluator?.score;

          let errTrack = erroredByPrefix.get(prefix);
          if (!errTrack) {
            errTrack = new Map();
            erroredByPrefix.set(prefix, errTrack);
          }
          const tally = errTrack.get(evaluatorName) ?? { errored: 0, scored: 0 };
          // A trace evaluator that found no spans reports 'unavailable', not 'error'.
          if (doc.evaluator?.label === 'error' || doc.evaluator?.label === 'unavailable') {
            tally.errored += 1;
            errTrack.set(evaluatorName, tally);
          }

          if (typeof score !== 'number') {
            if (options.useVerdictLadder && typeof doc.evaluator?.score === 'number') {
              excluded.unmappedVerdict += 1;
            }
          } else {
            tally.scored += 1;
            errTrack.set(evaluatorName, tally);

            let evaluators = byPrefix.get(prefix);
            if (!evaluators) {
              evaluators = new Map();
              byPrefix.set(prefix, evaluators);
            }
            const agg = evaluators.get(evaluatorName) ?? { sum: 0, count: 0 };
            agg.sum += score;
            agg.count += 1;
            evaluators.set(evaluatorName, agg);
          }
        }
      }
    }
  }

  options.onExcluded?.(excluded);

  return [...byPrefix.entries()].map(([prefix, evaluators]) => {
    // An evaluator that recovered on retry still produced a grade.
    const erroredOut = [...(erroredByPrefix.get(prefix)?.entries() ?? [])]
      .filter(([, tally]) => tally.errored > 0 && tally.scored === 0)
      .map(([name]) => name);
    return {
      datasetId: `prefix:${prefix}`,
      datasetName: prefix,
      evaluators: [...evaluators.entries()].map(([evaluatorName, agg]) => ({
        evaluatorName,
        mean: agg.sum / agg.count,
        count: agg.count,
      })),
      ...(erroredOut.length > 0 ? { erroredOutEvaluators: erroredOut } : {}),
    };
  });
};

/** Selects the most recent experiment per task model within the lookback window. */
export const pickLatestExperimentPerModel = (
  experiments: EvaluationExperimentSummary[],
  {
    lookbackDays,
    now = Date.now(),
    allowSelfJudged = false,
    onSelfJudgedRejected,
  }: {
    lookbackDays?: number;
    now?: number;
    allowSelfJudged?: boolean;
    /** Called for each experiment skipped because the grader was the graded model. */
    onSelfJudgedRejected?: (experiment: EvaluationExperimentSummary) => void;
  } = {}
): Map<string, EvaluationExperimentSummary> => {
  const cutoff = lookbackDays ? now - lookbackDays * 24 * 60 * 60 * 1000 : undefined;
  const latestByModel = new Map<string, { experiment: EvaluationExperimentSummary; at: number }>();

  for (const experiment of experiments) {
    const modelId = experiment.task_model?.id;
    if (modelId) {
      const at = Date.parse(experiment.timestamp);
      const withinLookback = Number.isFinite(at) && (cutoff === undefined || at >= cutoff);
      if (withinLookback) {
        // `now` doubles as the upper bound so a matrix can be rendered as of a point in time.
        if (at <= now) {
          // Skip self-judged runs here so an older, independently judged run can be picked.
          const judges = experiment.evaluator_models?.length
            ? experiment.evaluator_models
            : [experiment.evaluator_model];
          const rejectedSelfJudged =
            !allowSelfJudged &&
            judges.some((judge) => judge?.id && describeJudge(judge.id, modelId).selfJudged);
          if (rejectedSelfJudged) {
            onSelfJudgedRejected?.(experiment);
          } else {
            const existing = latestByModel.get(modelId);
            if (!existing || at > existing.at) {
              latestByModel.set(modelId, { experiment, at });
            }
          }
        }
      }
    }
  }

  return new Map([...latestByModel].map(([modelId, { experiment }]) => [modelId, experiment]));
};

/** Groups per-experiment evaluator stats by dataset. */
export const experimentStatsToDatasets = (stats: ExperimentStats): AggregatedDatasetScores[] => {
  const byDataset = new Map<string, AggregatedDatasetScores>();

  for (const stat of stats.stats) {
    let dataset = byDataset.get(stat.datasetId);
    if (!dataset) {
      dataset = { datasetId: stat.datasetId, datasetName: stat.datasetName, evaluators: [] };
      byDataset.set(stat.datasetId, dataset);
    }
    dataset.evaluators.push({
      evaluatorName: stat.evaluatorName,
      mean: stat.stats.mean,
      count: stat.stats.count,
      min: stat.stats.min,
      max: stat.stats.max,
    });
  }

  return [...byDataset.values()];
};

const toBranchList = (branch: string | string[] | undefined): Array<string | undefined> => {
  if (Array.isArray(branch)) {
    return branch.length > 0 ? branch : [undefined];
  }
  return [branch];
};

/**
 * Queries the latest experiment per (suite, model) and returns mean evaluator scores grouped by dataset.
 * Each pair is listed separately because the listing route's aggregation size grows with `page * per_page`.
 */
export const queryMatrixScores = async (
  evalsClient: MatrixEvalsClient,
  log: SomeDevLog,
  {
    suiteIds,
    modelIds,
    branch,
    branchBySuite,
    lookbackDays,
    asOf,
    prefixesBySuite = {},
    scoring,
    scoringBySuite,
  }: QueryMatrixScoresOptions
): Promise<AggregatedModelScores[]> => {
  const byModel = new Map<string, AggregatedModelScores>();
  const excludedByModel = new Map<string, ExcludedScoreCounts>();
  const exampleCoverage: Array<{
    modelId: string;
    suiteId: string;
    examples: number;
    repetitions: number;
  }> = [];

  for (const suiteId of suiteIds) {
    const suiteBranches = toBranchList(branchBySuite?.[suiteId] ?? branch);
    const suiteScoring = scoringBySuite?.[suiteId] ?? scoring;
    for (const modelId of modelIds) {
      // A suite's models can be split across branches, so union every configured branch.
      const experiments = (
        await Promise.all(
          suiteBranches.map((suiteBranch) =>
            evalsClient.listExperiments({
              suiteId,
              taskModelId: modelId,
              branch: suiteBranch,
              limit: MAX_LIST_EXPERIMENTS,
            })
          )
        )
      ).flat();
      const selfJudgedRejected: EvaluationExperimentSummary[] = [];
      const [latest] = [
        ...pickLatestExperimentPerModel(experiments, {
          lookbackDays,
          ...(asOf !== undefined ? { now: asOf } : {}),
          // suiteScoring already resolves per-suite override -> global -> undefined.
          // Absent config must not be stricter than an explicit `false`: only a
          // resolved excludeSelfJudged===true rejects self-judged runs.
          allowSelfJudged: suiteScoring?.excludeSelfJudged !== true,
          onSelfJudgedRejected: (rejected) => {
            selfJudgedRejected.push(rejected);
          },
        }).values(),
      ];

      log.debug(
        `Suite ${suiteId}, model ${modelId}: ${experiments.length} experiment(s)${
          latest ? '' : ', none within the lookback window'
        }`
      );

      if (!latest) {
        if (selfJudgedRejected.length > 0) {
          // Emit an empty suite record so the cell renders as "excluded", not "missing".
          const newest = selfJudgedRejected.reduce((a, b) =>
            Date.parse(b.timestamp) > Date.parse(a.timestamp) ? b : a
          );
          let withheldScores = 0;
          try {
            const withheldStats = await evalsClient.getExperimentStats(newest.experiment_id, {
              suiteId,
              taskModelId: modelId,
              executionId: newest.execution_id ?? newest.experiment_id,
            });
            withheldScores = (withheldStats?.stats ?? []).reduce(
              (total, entry) => total + (entry.stats?.count ?? 0),
              0
            );
          } catch (error) {
            log.debug(
              `Could not size withheld self-judged run for ${modelId}/${suiteId}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
          let withheldModel = byModel.get(modelId);
          if (!withheldModel) {
            withheldModel = { modelId, suites: [] };
            byModel.set(modelId, withheldModel);
          }
          withheldModel.suites.push({
            suiteId,
            experimentId: newest.experiment_id,
            excludedSelfJudged: withheldScores,
            datasets: [],
          });
        }
      } else {
        // The stats route must be filtered by execution_id; a bare experiment_id lookup 404s.
        // Gather every shard of the sweep, reapplying the `asOf` cutoff to the raw listing.
        const shardMembers = pickShardExperiments(
          experiments.filter((candidate) => {
            if (candidate.task_model?.id !== modelId) {
              return false;
            }
            if (asOf === undefined) {
              return true;
            }
            const at = Date.parse(candidate.timestamp);
            return Number.isFinite(at) && at <= asOf;
          })
        );
        const shards = shardMembers.some(
          (member) => member.execution_id === (latest.execution_id ?? latest.experiment_id)
        )
          ? shardMembers
          : [latest];

        const perShardStats = await Promise.all(
          shards.map((shard) =>
            evalsClient.getExperimentStats(shard.experiment_id, {
              suiteId,
              taskModelId: modelId,
              executionId: shard.execution_id ?? shard.experiment_id,
            })
          )
        );

        if (!perShardStats.some((entry) => entry)) {
          log.warning(
            `No stats for experiment ${latest.experiment_id} (suite ${suiteId}, model ${modelId})`
          );
        } else {
          let model = byModel.get(modelId);
          if (!model) {
            model = {
              modelId,
              family: latest.task_model?.family,
              provider: latest.task_model?.provider,
              suites: [],
            };
            byModel.set(modelId, model);
          }

          const datasets = mergeShardDatasets(
            perShardStats
              .filter((entry): entry is ExperimentStats => Boolean(entry))
              .map((entry) => experimentStatsToDatasets(entry))
          );
          const examplePrefixes = prefixesBySuite[suiteId] ?? [];
          if (examplePrefixes.length > 0) {
            try {
              const scores = (
                await Promise.all(
                  shards.map((shard) =>
                    evalsClient.getExperimentScores(shard.experiment_id, {
                      suiteId,
                      taskModelId: modelId,
                      executionId: shard.execution_id ?? shard.experiment_id,
                    })
                  )
                )
              ).flat();
              const before = datasets.length;
              datasets.push(
                ...scoresByPrefixToDatasets(scores, examplePrefixes, {
                  ...suiteScoring,
                  onExcluded: (counts) => {
                    if (counts.selfJudged + counts.nonEis + counts.unmappedVerdict > 0) {
                      excludedByModel.set(modelId, counts);
                    }
                  },
                })
              );
              const rejectedCounts = excludedByModel.get(modelId);
              if (datasets.length === before && rejectedCounts) {
                const judgeIssue = rejectedCounts.selfJudged + rejectedCounts.nonEis;
                const remedy =
                  judgeIssue === 0
                    ? `no score carried a mappable verdict — check that this suite's example ids match the column's examplePrefixes (a suite that writes a constant example id cannot be bucketed) before blaming the judge.`
                    : `Re-running this model will NOT fill these cells — fix the judge assignment first.`;
                log.warning(
                  `All per-prefix scores rejected for model ${modelId} (suite ${suiteId}): ` +
                    `${rejectedCounts.selfJudged} self-judged, ${rejectedCounts.nonEis} non-EIS judge, ${rejectedCounts.unmappedVerdict} unmapped verdict. ${remedy}`
                );
              }

              const exampleIds = new Set(
                scores
                  .map((doc) => doc.example?.id)
                  .filter((id): id is string => typeof id === 'string')
              );
              if (exampleIds.size > 0) {
                const repetitions = new Set(
                  scores
                    .map((doc) => doc.task?.repetition_index)
                    .filter((index): index is number => typeof index === 'number')
                );
                exampleCoverage.push({
                  modelId,
                  suiteId,
                  examples: exampleIds.size,
                  repetitions: repetitions.size,
                });
              }
            } catch (error) {
              log.warning(
                `Per-prefix scores unavailable for experiment ${
                  latest.experiment_id
                } (suite ${suiteId}, model ${modelId}): ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }
          }

          const excludedSelfJudgedCount = excludedByModel.get(modelId)?.selfJudged;
          model.suites.push({
            suiteId,
            experimentId: latest.experiment_id,
            executions: shards.map((s) => ({
              experimentId: s.experiment_id,
              executionId: s.execution_id ?? s.experiment_id,
            })),
            executionIds: shards.map((s) => s.execution_id ?? s.experiment_id),
            timestamp: latest.timestamp,
            commitSha: latest.git_commit_sha ?? undefined,
            selfJudged:
              latest.evaluator_model?.id && latest.task_model?.id
                ? describeJudge(latest.evaluator_model.id, latest.task_model.id).selfJudged
                : undefined,
            judgeModelId: latest.evaluator_model?.id ?? undefined,
            excludedSelfJudged:
              datasets.length === 0 &&
              excludedSelfJudgedCount !== undefined &&
              excludedSelfJudgedCount > 0
                ? excludedSelfJudgedCount
                : undefined,
            datasets,
          });
        }
      }
    }
  }

  // The modal example count per suite is treated as its full size.
  const bySuite = new Map<string, number[]>();
  for (const entry of exampleCoverage) {
    const list = bySuite.get(entry.suiteId) ?? [];
    list.push(entry.examples);
    bySuite.set(entry.suiteId, list);
  }
  for (const [suiteId, sizes] of bySuite) {
    const tally = new Map<number, number>();
    for (const n of sizes) tally.set(n, (tally.get(n) ?? 0) + 1);
    let full = 0;
    let best = 0;
    for (const [n, c] of tally) {
      if (c > best || (c === best && n > full)) {
        full = n;
        best = c;
      }
    }
    for (const entry of exampleCoverage) {
      if (entry.suiteId === suiteId && entry.examples < full) {
        log.warning(
          `${entry.modelId} scored on ${entry.examples} of ${full} examples in ${suiteId} -- its score rests on an incomplete run and is not comparable to models that ran all ${full}`
        );
      }
    }

    const repTally = new Map<number, number>();
    for (const entry of exampleCoverage) {
      if (entry.suiteId === suiteId && entry.repetitions > 0) {
        repTally.set(entry.repetitions, (repTally.get(entry.repetitions) ?? 0) + 1);
      }
    }
    let modalReps = 0;
    let modalRepCount = 0;
    for (const [reps, count] of repTally) {
      // Tie-break toward the lower repetition count so the higher-rep row is flagged.
      const unset = modalRepCount === 0;
      if (unset || count > modalRepCount || (count === modalRepCount && reps < modalReps)) {
        modalReps = reps;
        modalRepCount = count;
      }
    }
    const better = [...repTally.keys()].filter((reps) => reps > modalReps);
    if (better.length > 0) {
      const maxReps = Math.max(...better);
      const advantaged = exampleCoverage
        .filter((entry) => entry.suiteId === suiteId && entry.repetitions === maxReps)
        .map((entry) => entry.modelId);
      log.warning(
        `Repetition imbalance in ${suiteId}: most models were measured with ${modalReps} repetition(s), but ${advantaged.join(
          ', '
        )} ran ${maxReps} -- the higher-repetition rows carry a narrower error bar, so ranking them against the rest compares estimates of unequal precision`
      );
    }
  }

  for (const [modelId, counts] of excludedByModel) {
    if (counts.selfJudged > 0) {
      log.warning(
        `${modelId}: dropped ${counts.selfJudged} self-judged score doc(s). ` +
          `Excluding them is correct, but a model judged by itself is not evidence ` +
          `of quality — re-run it against an independent judge to fill those cells.`
      );
    }
  }
  log.debug(`Matrix query resolved ${byModel.size} model(s) across ${suiteIds.length} suite(s)`);
  return [...byModel.values()].map((model) => {
    const excluded = excludedByModel.get(model.modelId);
    return excluded ? { ...model, excluded } : model;
  });
};
