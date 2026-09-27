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
  /**
   * Score docs rejected by the judge policy for THIS dataset (prefix column) only.
   * Set when a column's own scores were all withheld, even though sibling prefixes
   * in the same suite survived — a suite-level flag would hide the completed-but-
   * rejected run and render this column as ordinary missing data.
   */
  excludedSelfJudged?: number;
  /** Same as `excludedSelfJudged`, for the non-EIS-judge policy. */
  excludedNonEis?: number;
  /** True when an admitted score in THIS dataset was self-judged (prefix columns only). */
  selfJudged?: boolean;
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
  /** Scores rejected because the judge was not EIS-backed; set only when the rejection
   * emptied the suite's prefix datasets (mirrors `excludedSelfJudged`). */
  excludedNonEis?: number;
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
  // Per-prefix judge-policy rejections: a column whose every doc was withheld must
  // surface as `excluded:*` even when sibling prefixes in the suite survived.
  const excludedByPrefix = new Map<string, { selfJudged: number; nonEis: number }>();
  // Per-prefix admission flag: a suite may mix self-judged and independently judged
  // prefixes, and `cellExtras.selfJudged` must reflect only the datasets a column
  // actually reads (a suite-wide flag would mislabel an independently judged column).
  const selfJudgedByPrefix = new Map<string, boolean>();
  const excluded: ExcludedScoreCounts = {
    nonQuality: 0,
    nonEis: 0,
    selfJudged: 0,
    unmappedVerdict: 0,
  };
  const tallyPrefixExclusion = (prefix: string, kind: 'selfJudged' | 'nonEis'): void => {
    const entry = excludedByPrefix.get(prefix) ?? { selfJudged: 0, nonEis: 0 };
    entry[kind] += 1;
    excludedByPrefix.set(prefix, entry);
  };

  for (const doc of scores) {
    const exampleId = doc.example?.id ?? '';
    // Every configured prefix the example matches, not just the first: `alert` and
    // `alert-analysis` columns must EACH see `alert-analysis-a`, or column order alone
    // decides which one renders empty (find() assigned it to the first match only).
    const matchingPrefixes = prefixes.filter(
      (p) => exampleId === p || exampleId.startsWith(`${p}-`)
    );
    for (const prefix of matchingPrefixes) {
      const evaluatorName = doc.evaluator?.name;
      const direction = (doc.evaluator as { direction?: string } | undefined)?.direction;
      if (evaluatorName) {
        const judgeId = doc.evaluator?.model?.id;
        const taskModelId = doc.task?.model?.id;
        // An admitted provenance of "no judge id at all" is indistinguishable from a
        // non-EIS judge when requireEisJudge is on: without this, a doc whose evaluator
        // omitted its judge model silently contributes to a matrix that claims every
        // score is EIS-graded.
        const rejectedEisJudge = options.requireEisJudge && (!judgeId || !isEisBacked(judgeId));
        if (rejectedEisJudge) {
          excluded.nonEis += 1;
          tallyPrefixExclusion(prefix, 'nonEis');
        }
        const rejectedSelfJudged =
          !rejectedEisJudge &&
          options.excludeSelfJudged &&
          judgeId &&
          taskModelId &&
          describeJudge(judgeId, taskModelId).selfJudged;
        if (rejectedSelfJudged) {
          excluded.selfJudged += 1;
          tallyPrefixExclusion(prefix, 'selfJudged');
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
          // A trace evaluator that found no spans reports 'unavailable', not 'error'.
          if (doc.evaluator?.label === 'error' || doc.evaluator?.label === 'unavailable') {
            if (!errTrack) {
              errTrack = new Map();
              erroredByPrefix.set(prefix, errTrack);
            }
            const tally = errTrack.get(evaluatorName) ?? { errored: 0, scored: 0 };
            tally.errored += 1;
            errTrack.set(evaluatorName, tally);
          }

          if (typeof score !== 'number') {
            if (options.useVerdictLadder && typeof doc.evaluator?.score === 'number') {
              excluded.unmappedVerdict += 1;
            }
          } else {
            if (errTrack) {
              const tally = errTrack.get(evaluatorName) ?? { errored: 0, scored: 0 };
              tally.scored += 1;
              errTrack.set(evaluatorName, tally);
            }

            if (judgeId && taskModelId && describeJudge(judgeId, taskModelId).selfJudged) {
              selfJudgedByPrefix.set(prefix, true);
            }
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

  // Union with erroredByPrefix: a prefix where every evaluator errored (no numeric score
  // survived) exists only in erroredByPrefix and must still surface as a completed-but-broken
  // cell, not silently vanish as ordinary missing data. Same for a prefix whose every doc was
  // rejected by the judge policy: it exists only in excludedByPrefix and must render as
  // `excluded:*` rather than missing.
  const allPrefixes = new Set<string>([
    ...byPrefix.keys(),
    ...erroredByPrefix.keys(),
    ...excludedByPrefix.keys(),
  ]);

  return [...allPrefixes].map((prefix) => {
    const evaluators = byPrefix.get(prefix) ?? new Map<string, { sum: number; count: number }>();
    // An evaluator that recovered on retry still produced a grade.
    const erroredOut = [...(erroredByPrefix.get(prefix)?.entries() ?? [])]
      .filter(([, tally]) => tally.errored > 0 && tally.scored === 0)
      .map(([name]) => name);
    const prefixExclusions = excludedByPrefix.get(prefix);
    return {
      datasetId: `prefix:${prefix}`,
      datasetName: prefix,
      evaluators: [...evaluators.entries()].map(([evaluatorName, agg]) => ({
        evaluatorName,
        mean: agg.sum / agg.count,
        count: agg.count,
      })),
      ...(erroredOut.length > 0 ? { erroredOutEvaluators: erroredOut } : {}),
      ...(selfJudgedByPrefix.get(prefix) === true ? { selfJudged: true } : {}),
      // Exposed per dataset so buildCell can mark THIS column excluded even when
      // sibling prefixes in the suite kept admissible scores.
      ...(prefixExclusions && prefixExclusions.selfJudged > 0
        ? { excludedSelfJudged: prefixExclusions.selfJudged }
        : {}),
      ...(prefixExclusions && prefixExclusions.nonEis > 0
        ? { excludedNonEis: prefixExclusions.nonEis }
        : {}),
    };
  });
};

/** Every judge model on an experiment, whether reported singly (`evaluator_model`) or as a multi-judge run (`evaluator_models`). */
const experimentJudges = (
  experiment: EvaluationExperimentSummary
): Array<{ id?: string } | undefined> =>
  experiment.evaluator_models?.length ? experiment.evaluator_models : [experiment.evaluator_model];

/** Derived judge provenance for a suite row, folding in every shard member's judges — not just `latest`'s. */
interface DerivedRowJudgeInfo {
  selfJudged?: boolean;
  judgeModelId?: string;
  judgeModelIds?: string[];
}

const judgeInfoFromIds = (judgeIds: Set<string>, taskModelId: string): DerivedRowJudgeInfo => {
  if (judgeIds.size === 0) {
    return {};
  }
  const selfJudged = [...judgeIds].some((id) => describeJudge(id, taskModelId).selfJudged);
  if (judgeIds.size === 1) {
    return { selfJudged, judgeModelId: [...judgeIds][0] };
  }
  return { selfJudged, judgeModelIds: [...judgeIds].sort() };
};

const deriveRowJudgeInfo = (
  experiments: EvaluationExperimentSummary[],
  taskModelId: string
): DerivedRowJudgeInfo => {
  const judgeIds = new Set<string>();
  for (const experiment of experiments) {
    for (const judge of experimentJudges(experiment)) {
      if (judge?.id) {
        judgeIds.add(judge.id);
      }
    }
  }
  return judgeInfoFromIds(judgeIds, taskModelId);
};

/** Selects the most recent experiment per task model within the lookback window. */
export const pickLatestExperimentPerModel = (
  experiments: EvaluationExperimentSummary[],
  {
    lookbackDays,
    now = Date.now(),
    allowSelfJudged = false,
    rejectWhenAnySelfJudged = true,
    onSelfJudgedRejected,
  }: {
    lookbackDays?: number;
    now?: number;
    allowSelfJudged?: boolean;
    /**
     * When `false`, an experiment is only rejected if EVERY judge on it is self-judged
     * (used for prefix-bucketed suites, whose per-document aggregation in
     * `scoresByPrefixToDatasets` can separate a mixed independent-judge/self-judge run and
     * keep the independent verdicts). Defaults to `true`: reject on any self-judged judge,
     * which is required for the pre-aggregated stats path — it has no per-document filter,
     * so a mixed run would otherwise publish a mean partly derived from self-judged scores.
     */
    rejectWhenAnySelfJudged?: boolean;
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
          const judges = experimentJudges(experiment);
          const judgedSelf = judges.map(
            (judge) => Boolean(judge?.id) && describeJudge(judge?.id ?? '', modelId).selfJudged
          );
          const rejectedSelfJudged =
            !allowSelfJudged &&
            (rejectWhenAnySelfJudged ? judgedSelf.some(Boolean) : judgedSelf.every(Boolean));
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
    const suitePrefixes = prefixesBySuite[suiteId] ?? [];
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
          // Prefix-bucketed suites read raw score documents and apply excludeSelfJudged per
          // document in scoresByPrefixToDatasets below, so a mixed experiment (one independent
          // judge + one self-judge) can still contribute its independent verdicts — only reject
          // outright when EVERY judge on it is self-judged. The pre-aggregated stats path below
          // has no per-document filter, so it must keep rejecting on ANY self-judged judge.
          rejectWhenAnySelfJudged: suitePrefixes.length === 0,
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
        // Gather every shard of the sweep, reapplying the `asOf` cutoff AND the self-judge policy
        // to the raw listing. `pickLatestExperimentPerModel` only vets the chosen `latest`; the
        // shard reconstruction starts from the unfiltered list, so a rejected self-judged shard
        // would be merged back into the published score. On the stats path there is no
        // per-document filter, so any self-judged judge disqualifies the whole experiment —
        // but prefix suites DO filter per document in `scoresByPrefixToDatasets`, so their
        // shards must survive this summary-level rejection or a mixed sweep loses the
        // older shard's admissible independent verdicts entirely.
        const excludeSelfJudged = suiteScoring?.excludeSelfJudged === true;
        const isPrefixSuite = (prefixesBySuite[suiteId] ?? []).length > 0;
        const admitsJudgedPolicy = (candidate: EvaluationExperimentSummary): boolean => {
          if (!excludeSelfJudged || isPrefixSuite) {
            return true;
          }
          return !experimentJudges(candidate).some(
            (judge) => Boolean(judge?.id) && describeJudge(judge?.id ?? '', modelId).selfJudged
          );
        };
        const shardMembers = pickShardExperiments(
          experiments.filter((candidate) => {
            if (candidate.task_model?.id !== modelId) {
              return false;
            }
            if (!admitsJudgedPolicy(candidate)) {
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
          // Hoisted out of the try block below: this suite's own exclusion counts,
          // read after the try/catch to size `excludedSelfJudged` on the pushed row —
          // reading the cross-suite `excludedByModel` accumulator there would carry
          // an earlier suite's rejection counts onto this suite's row.
          let suiteExcludedCounts: ExcludedScoreCounts | undefined;
          // Set only for `examplePrefixes` suites whose synthetic prefix datasets all failed the
          // judge policy; those columns ignore the pre-aggregated stats datasets entirely.
          let noPrefixDatasetSurvived = false;
          let prefixScores: EvaluationScoreDocument[] = [];
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
              prefixScores = scores;
              const before = datasets.length;
              // excludedByModel accumulates across every suite for the final audit summary;
              // reading it back for labeling here would attribute an earlier suite's
              // rejections to this one. Assign to the suite-scoped variable instead.
              const prefixDatasets = scoresByPrefixToDatasets(scores, examplePrefixes, {
                ...suiteScoring,
                onExcluded: (counts) => {
                  if (counts.selfJudged + counts.nonEis + counts.unmappedVerdict > 0) {
                    suiteExcludedCounts = counts;
                    // Accumulate across suites: the audit summary reads this map after every
                    // suite has run, so overwriting here would let a later suite's rejection
                    // reason erase an earlier one for the same model.
                    const prior = excludedByModel.get(modelId);
                    excludedByModel.set(modelId, {
                      nonQuality: (prior?.nonQuality ?? 0) + counts.nonQuality,
                      nonEis: (prior?.nonEis ?? 0) + counts.nonEis,
                      selfJudged: (prior?.selfJudged ?? 0) + counts.selfJudged,
                      unmappedVerdict: (prior?.unmappedVerdict ?? 0) + counts.unmappedVerdict,
                    });
                  }
                },
              });
              datasets.push(...prefixDatasets);
              // The suite's own prefix datasets, not `datasets`: `datasets` is seeded from the
              // pre-aggregated stats route, so it is usually non-empty even when every synthetic
              // `prefix:*` dataset was rejected. Keying "nothing survived" off the whole array
              // would make an all-rejected prefix column render as ordinary missing data.
              // A dataset that survived only as an exclusion record (every doc withheld, no
              // evaluators) counts as "nothing survived" too, so the suite-level excluded:*
              // labeling still fires alongside the per-dataset counts.
              noPrefixDatasetSurvived =
                prefixDatasets.length === 0 ||
                prefixDatasets.every(
                  (d) =>
                    d.evaluators.length === 0 &&
                    ((d.excludedSelfJudged ?? 0) > 0 || (d.excludedNonEis ?? 0) > 0)
                );
              if (datasets.length === before && suiteExcludedCounts) {
                const judgeIssue = suiteExcludedCounts.selfJudged + suiteExcludedCounts.nonEis;
                const remedy =
                  judgeIssue === 0
                    ? `no score carried a mappable verdict — check that this suite's example ids match the column's examplePrefixes (a suite that writes a constant example id cannot be bucketed) before blaming the judge.`
                    : `Re-running this model will NOT fill these cells — fix the judge assignment first.`;
                log.warning(
                  `All per-prefix scores rejected for model ${modelId} (suite ${suiteId}): ` +
                    `${suiteExcludedCounts.selfJudged} self-judged, ${suiteExcludedCounts.nonEis} non-EIS judge, ${suiteExcludedCounts.unmappedVerdict} unmapped verdict. ${remedy}`
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

          const excludedSelfJudgedCount = suiteExcludedCounts?.selfJudged;
          // For prefix suites, `shards` carry every judge that ever graded the shard — including
          // self-judged ones the per-document filter below then excluded. Provenance must reflect
          // the documents actually admitted, so collect judge ids from the surviving prefix docs.
          const admittedJudgeIds = new Set<string>();
          if (examplePrefixes.length > 0 && noPrefixDatasetSurvived === false) {
            // Admission mirrors scoresByPrefixToDatasets' per-document policy for this suite
            // (suiteScoring already resolves per-suite override -> global -> undefined; the
            // flags are truthiness-checked exactly like scoresByPrefixToDatasets does).
            const forbidSelfJudged = suiteScoring?.excludeSelfJudged === true;
            const requireEis = suiteScoring?.requireEisJudge === true;
            const admittedDocs = prefixScores.filter((doc) => {
              const judgeId = doc.evaluator?.model?.id;
              if (typeof judgeId !== 'string') {
                return false;
              }
              if (forbidSelfJudged && describeJudge(judgeId, modelId).selfJudged) {
                return false;
              }
              return !(requireEis && !isEisBacked(judgeId));
            });
            for (const doc of admittedDocs) {
              const judgeId = doc.evaluator?.model?.id;
              if (typeof judgeId === 'string') {
                admittedJudgeIds.add(judgeId);
              }
            }
          }
          const rowJudgeInfo =
            examplePrefixes.length > 0 && noPrefixDatasetSurvived === false
              ? judgeInfoFromIds(admittedJudgeIds, modelId)
              : deriveRowJudgeInfo(shards, modelId);
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
            ...rowJudgeInfo,
            excludedSelfJudged:
              (examplePrefixes.length > 0 ? noPrefixDatasetSurvived : datasets.length === 0) &&
              excludedSelfJudgedCount !== undefined &&
              excludedSelfJudgedCount > 0
                ? excludedSelfJudgedCount
                : undefined,
            // A prefix column whose every doc failed the EIS-judge policy must render as
            // `excluded:non-eis-judge`, not ordinary missing data — the run happened, the
            // judge assignment is what needs fixing.
            excludedNonEis:
              (examplePrefixes.length > 0 ? noPrefixDatasetSurvived : datasets.length === 0) &&
              (suiteExcludedCounts?.nonEis ?? 0) > 0 &&
              (excludedSelfJudgedCount ?? 0) === 0
                ? suiteExcludedCounts?.nonEis
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
