/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const escapeRegExpLiteral = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Compiles an Elasticsearch-style glob, where `*` is the only wildcard, to an anchored RegExp. */
export const compileGlob = (pattern: string): RegExp =>
  new RegExp(`^${pattern.split('*').map(escapeRegExpLiteral).join('.*')}$`);

/** The literal text before a pattern's first `*`; the whole pattern when it has none. */
export const literalPrefix = (pattern: string): string => pattern.split('*')[0];

/**
 * Whether two glob patterns can share a match. A concrete `candidate` is tested exactly; a
 * wildcard one is judged by literal prefix (either starts with the other), which is
 * deliberately conservative.
 */
export const globsOverlap = (candidate: string, other: string): boolean => {
  if (!candidate.includes('*')) return compileGlob(other).test(candidate);
  const a = literalPrefix(candidate);
  const b = literalPrefix(other);
  return a.startsWith(b) || b.startsWith(a);
};

/**
 * Whether a positive scope entry's cluster covers a candidate's. Local covers only local.
 * A concrete candidate cluster is globbed against the entry's alias (`*:logs-*` covers
 * `infosec_zocalo:`), which is what Elasticsearch itself would expand. A wildcard candidate
 * cluster is covered only by that exact string, so `*:` cannot widen past `infosec_zocalo:`.
 */
export const clusterCovers = (
  entryCluster: string | undefined,
  candidateCluster: string | undefined
): boolean => {
  if (entryCluster === undefined || candidateCluster === undefined) {
    return entryCluster === candidateCluster;
  }
  if (candidateCluster.includes('*')) return entryCluster === candidateCluster;
  return compileGlob(entryCluster).test(candidateCluster);
};

/**
 * Whether an exclusion's cluster could reach a candidate's: a local exclusion only reaches
 * local candidates, a `<cluster>:` one any cluster its glob could share.
 */
export const exclusionReachesCluster = (
  exclusionCluster: string | undefined,
  candidateCluster: string | undefined
): boolean => {
  if (exclusionCluster === undefined || candidateCluster === undefined) {
    return exclusionCluster === candidateCluster;
  }
  return globsOverlap(candidateCluster, exclusionCluster);
};
