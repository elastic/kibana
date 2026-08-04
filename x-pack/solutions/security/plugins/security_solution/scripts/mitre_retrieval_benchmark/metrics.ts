/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Binary-relevance retrieval metrics.
 *
 * A query's ground truth is a set of MITRE ids; `ranked` is the ordered list of
 * ids a given arm returned. Every metric treats a returned id as relevant if it
 * appears in the ground-truth set, so partial credit comes from rank position
 * rather than graded relevance.
 */

/** Fraction of the relevant ids that appear in the top `k` results. */
export const recallAtK = (ranked: string[], relevant: Set<string>, k: number): number => {
  if (relevant.size === 0) return 0;
  const found = ranked.slice(0, k).filter((id) => relevant.has(id));
  return new Set(found).size / relevant.size;
};

/**
 * Whether *any* relevant id appears in the top `k`.
 *
 * Both consumers hand the whole candidate block to an LLM that then picks one
 * entity, so a query succeeds as soon as one correct entity is in the block.
 * `recallAtK` understates that case: it divides by the size of the ground-truth
 * set, so a query labelled with three techniques scores 0.33 for surfacing a
 * correct one. Prefer this metric for multi-label strata; for the single-label
 * strata the two are identical.
 */
export const successAtK = (ranked: string[], relevant: Set<string>, k: number): number =>
  ranked.slice(0, k).some((id) => relevant.has(id)) ? 1 : 0;

/**
 * Reciprocal of the rank of the first relevant result, or 0 when none of the
 * top `k` are relevant. Captures "did the right answer come up first", which is
 * what matters when an LLM only reads the head of the candidate list.
 */
export const reciprocalRank = (ranked: string[], relevant: Set<string>, k: number): number => {
  const index = ranked.slice(0, k).findIndex((id) => relevant.has(id));
  return index === -1 ? 0 : 1 / (index + 1);
};

const dcg = (gains: number[]): number =>
  gains.reduce((sum, gain, index) => sum + gain / Math.log2(index + 2), 0);

/**
 * Normalised discounted cumulative gain. Unlike recall it rewards putting
 * several relevant ids near the top, which is the shape that matters when the
 * whole candidate block is handed to a model.
 */
export const ndcgAtK = (ranked: string[], relevant: Set<string>, k: number): number => {
  if (relevant.size === 0) return 0;

  const seen = new Set<string>();
  const gains = ranked.slice(0, k).map((id) => {
    // Duplicate ids earn nothing the second time around.
    if (!relevant.has(id) || seen.has(id)) return 0;
    seen.add(id);
    return 1;
  });

  const idealGains = new Array(Math.min(relevant.size, k)).fill(1);
  const idealDcg = dcg(idealGains);
  return idealDcg === 0 ? 0 : dcg(gains) / idealDcg;
};

export const percentile = (values: number[], fraction: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[Math.max(0, index)];
};

export const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
