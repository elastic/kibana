/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationExperimentSummary } from '@kbn/evals-common';
import type { AggregatedDatasetScores } from './query_matrix_scores';

/** `sweep-123-s2of4::suite::model` -> `sweep-123`. Undefined when unsharded. */
const shardBase = (executionId: string | undefined): string | undefined => {
  if (!executionId) {
    return undefined;
  }
  const runId = executionId.split('::')[0];
  const match = /^(.*)-s\d+of\d+$/.exec(runId);
  return match ? match[1] : undefined;
};

/** Returns every experiment (shard) belonging to the newest sweep; an unsharded run is returned alone. */
export const pickShardExperiments = (
  experiments: EvaluationExperimentSummary[]
): EvaluationExperimentSummary[] => {
  if (experiments.length === 0) {
    return [];
  }

  const bySweep = new Map<string, { members: EvaluationExperimentSummary[]; at: number }>();

  for (const candidate of experiments) {
    const base = shardBase(candidate.execution_id);
    const key = base ?? `unsharded:${candidate.execution_id ?? candidate.experiment_id}`;
    const at = Date.parse(candidate.timestamp);
    if (Number.isFinite(at)) {
      const group = bySweep.get(key);
      if (group) {
        group.members.push(candidate);
        // A sweep is as recent as its LAST finishing shard.
        group.at = Math.max(group.at, at);
      } else {
        bySweep.set(key, { members: [candidate], at });
      }
    }
  }

  const newest = [...bySweep.values()].reduce<{
    members: EvaluationExperimentSummary[];
    at: number;
  } | null>((best, group) => (!best || group.at > best.at ? group : best), null);

  if (!newest) {
    return [];
  }

  return [...newest.members].sort((a, b) =>
    (a.execution_id ?? '').localeCompare(b.execution_id ?? '')
  );
};

/** Folds per-shard dataset scores into one set, weighting means by count. */
export const mergeShardDatasets = (
  shards: AggregatedDatasetScores[][]
): AggregatedDatasetScores[] => {
  const byDataset = new Map<
    string,
    {
      datasetId: string;
      datasetName: string;
      evaluators: Map<
        string,
        { sum: number; count: number; min: number | undefined; max: number | undefined }
      >;
    }
  >();

  for (const shard of shards) {
    for (const dataset of shard) {
      let entry = byDataset.get(dataset.datasetId);
      if (!entry) {
        entry = {
          datasetId: dataset.datasetId,
          datasetName: dataset.datasetName,
          evaluators: new Map(),
        };
        byDataset.set(dataset.datasetId, entry);
      }

      for (const evaluator of dataset.evaluators) {
        const agg = entry.evaluators.get(evaluator.evaluatorName) ?? {
          sum: 0,
          count: 0,
          min: undefined,
          max: undefined,
        };
        agg.sum += evaluator.mean * evaluator.count;
        agg.count += evaluator.count;
        agg.min =
          evaluator.min === undefined ? agg.min : Math.min(agg.min ?? evaluator.min, evaluator.min);
        agg.max =
          evaluator.max === undefined ? agg.max : Math.max(agg.max ?? evaluator.max, evaluator.max);
        entry.evaluators.set(evaluator.evaluatorName, agg);
      }
    }
  }

  return [...byDataset.values()].map((entry) => ({
    datasetId: entry.datasetId,
    datasetName: entry.datasetName,
    evaluators: [...entry.evaluators.entries()].map(([evaluatorName, agg]) => ({
      evaluatorName,
      mean: agg.count === 0 ? 0 : agg.sum / agg.count,
      count: agg.count,
      ...(agg.min === undefined ? {} : { min: agg.min }),
      ...(agg.max === undefined ? {} : { max: agg.max }),
    })),
  }));
};
