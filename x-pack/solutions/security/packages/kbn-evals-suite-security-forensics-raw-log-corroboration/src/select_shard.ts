/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Dataset sharding for parallel sweeps.
 *
 * Each example drives a live agent conversation, so a full pass serialises into
 * minutes per example on one stack. Repeated sampling (multi-rep baselines)
 * multiplies that. Splitting examples across VMs — one Kibana each, since the
 * specs' beforeAll/afterAll share seeded forensic indices and extra in-process
 * workers would tear down live fixtures — is the only safe parallelism.
 */

/**
 * Selects this run's slice of a dataset from an `"<index>/<total>"` spec.
 *
 * Assignment is by stride (`position % total`), not contiguous slicing:
 * per-example cost is skewed, so neighbouring examples must land on different
 * shards to keep wall clock balanced.
 *
 * A malformed spec throws rather than falling back to the full dataset: a
 * silent fallback makes every shard run every example while the sweep still
 * reports a complete run, and the doc-count gate then passes on N× the
 * expected documents.
 */
export function selectShard<T>(examples: readonly T[], spec: string | undefined): T[] {
  // An unset variable and one exported empty or blank by shell plumbing both
  // mean "no sharding" — only a non-empty, unparseable spec is an error.
  const trimmed = spec?.trim();
  if (!trimmed) {
    return [...examples];
  }

  const match = /^(\d+)\/(\d+)$/.exec(trimmed);
  const index = match ? Number(match[1]) : NaN;
  const total = match ? Number(match[2]) : NaN;

  if (!match || total < 1 || index < 1 || index > total) {
    throw new Error(`EVAL_SHARD must be "<index>/<total>" with 1 <= index <= total, got "${spec}"`);
  }

  return examples.filter((_, position) => position % total === index - 1);
}
