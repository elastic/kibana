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

/**
 * Whether `text` matches an Elasticsearch-style glob, where `*` is the only wildcard. A
 * two-pointer scan that remembers the last `*`, so it takes at most pattern times text steps
 * and cannot backtrack catastrophically the way a regular expression with many `.*` can.
 */
export const globMatches = (pattern: string, text: string): boolean => {
  let p = 0;
  let t = 0;
  let star = -1;
  let resume = 0;
  while (t < text.length) {
    if (p < pattern.length && pattern[p] === '*') {
      star = p;
      resume = t;
      p += 1;
    } else if (p < pattern.length && pattern[p] === text[t]) {
      p += 1;
      t += 1;
    } else if (star !== -1) {
      p = star + 1;
      resume += 1;
      t = resume;
    } else {
      return false;
    }
  }
  while (p < pattern.length && pattern[p] === '*') p += 1;
  return p === pattern.length;
};

/** The literal text before a pattern's first `*`; the whole pattern when it has none. */
export const literalPrefix = (pattern: string): string => pattern.split('*')[0];

/**
 * Whether two glob patterns can share a match. A concrete `candidate` is tested exactly; a
 * wildcard one is judged by literal prefix (either starts with the other), which is
 * deliberately conservative.
 */
export const globsOverlap = (candidate: string, other: string): boolean => {
  if (!candidate.includes('*')) return globMatches(other, candidate);
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
  return globMatches(entryCluster, candidateCluster);
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
