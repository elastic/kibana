/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationExperimentSummary } from '@kbn/evals-common';
import type { AggregatedDatasetScores } from './query_matrix_scores';

/** `sweep-123-s2of4::suite::model` -> `{ base: 'sweep-123', index: 2, count: 4 }`. Undefined when unsharded. */
const parseShard = (
  executionId: string | undefined
): { base: string; index: number; count: number } | undefined => {
  if (!executionId) {
    return undefined;
  }
  const runId = executionId.split('::')[0];
  const match = /^(.*)-s(\d+)of(\d+)$/.exec(runId);
  return match ? { base: match[1], index: Number(match[2]), count: Number(match[3]) } : undefined;
};

/** A sweep is complete when every encoded shard index 1..count is present (deduped). */
const sweepIsComplete = (members: EvaluationExperimentSummary[]): boolean => {
  const shards = members
    .map((member) => parseShard(member.execution_id))
    .filter(
      (shard): shard is { base: string; index: number; count: number } => shard !== undefined
    );
  if (shards.length === 0) {
    return true; // unsharded
  }
  const count = shards[0].count;
  if (shards.some((shard) => shard.count !== count)) {
    return false; // inconsistent encoding within one sweep — treat as incomplete
  }
  const indices = new Set(shards.map((shard) => shard.index));
  for (let expected = 1; expected <= count; expected++) {
    if (!indices.has(expected)) {
      return false;
    }
  }
  return true;
};

/** Returns every experiment (shard) belonging to the newest COMPLETE sweep; an unsharded run is returned alone. */
export const pickShardExperiments = (
  experiments: EvaluationExperimentSummary[]
): EvaluationExperimentSummary[] => {
  if (experiments.length === 0) {
    return [];
  }

  const bySweep = new Map<string, { members: EvaluationExperimentSummary[]; at: number }>();

  for (const candidate of experiments) {
    const shard = parseShard(candidate.execution_id);
    const key = shard?.base ?? `unsharded:${candidate.execution_id ?? candidate.experiment_id}`;
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

  // Newest-first; a partial newest sweep loses to the newest COMPLETE one so a
  // failed sweep cannot silently shrink the matrix.
  const ordered = [...bySweep.values()].sort((a, b) => b.at - a.at);
  const newest = ordered.find((group) => sweepIsComplete(group.members));

  if (!newest) {
    return [];
  }

  // Dedupe by execution_id (falling back to experiment_id): the same listing can appear
  // twice when a suite spans branches (queryMatrixScores unions branch experiments), and
  // every returned member is fetched and count-weighted downstream — a duplicate shard
  // would double-count its examples in the merged dataset means.
  const memberIds = new Set<string>();
  const unique = newest.members.filter((member) => {
    const id = member.execution_id ?? member.experiment_id;
    if (memberIds.has(id)) {
      return false;
    }
    memberIds.add(id);
    return true;
  });

  return [...unique].sort((a, b) => (a.execution_id ?? '').localeCompare(b.execution_id ?? ''));
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
