/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DATA_STREAM_BACKING_PREFIX = '.ds-';

const escapeRegExpLiteral = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds a predicate that is true when a concrete `_index` value matches one of
 * the required index patterns. Data-stream backing indices (`.ds-…`) are
 * stripped to their data-stream name before testing so `logs-aws.*` matches
 * `.ds-logs-aws.cloudtrail-default-2026.09.01-000001`.
 */
/** A `-pattern` entry, the multi-target exclusion syntax `_search` and `_count` accept. */
const isExclusion = (pattern: string): boolean => pattern.startsWith('-');

const compileGlobs = (patterns: string[]): RegExp[] =>
  patterns.map(
    (pattern) => new RegExp(`^${pattern.split('*').map(escapeRegExpLiteral).join('.*')}$`)
  );

/**
 * Exclusion entries (`-logs-elastic_agent*`) are honoured the way Elasticsearch
 * honours them in the search itself: an index is required only if a positive
 * pattern matches it and no exclusion does. A broad hunt scope carries them so
 * the agent-internal streams stay out of both tiers.
 */
export const buildMatchesRequired = (requiredPatterns: string[]): ((index: string) => boolean) => {
  const positives = compileGlobs(requiredPatterns.filter((pattern) => !isExclusion(pattern)));
  const negatives = compileGlobs(
    requiredPatterns.filter(isExclusion).map((pattern) => pattern.slice(1))
  );
  return (index: string): boolean => {
    const concrete = index.startsWith(DATA_STREAM_BACKING_PREFIX)
      ? index.slice(DATA_STREAM_BACKING_PREFIX.length)
      : index;
    return (
      positives.some((pattern) => pattern.test(concrete)) &&
      !negatives.some((pattern) => pattern.test(concrete))
    );
  };
};

/** The literal text before a pattern's first `*`; the whole pattern when it has none. */
const literalPrefix = (pattern: string): string => pattern.split('*')[0];

/**
 * Whether a candidate source could resolve to anything an exclusion covers.
 * A concrete candidate is checked exactly. A wildcard candidate is judged by
 * its literal prefix: if that prefix and the exclusion's prefix are compatible
 * (either starts with the other) the two can share a match once Elasticsearch
 * expands the wildcard (`logs-e*` reaches `logs-elastic_agent-default`), so the
 * candidate is treated as overlapping. That is deliberately conservative: a
 * refusal falls back to the matched indices, an acceptance would read excluded
 * streams.
 */
const stripBackingPrefix = (name: string): string =>
  name.startsWith(DATA_STREAM_BACKING_PREFIX)
    ? name.slice(DATA_STREAM_BACKING_PREFIX.length)
    : name;

const overlapsExclusion = (rawCandidate: string, exclusion: string): boolean => {
  // The positive check strips `.ds-` so a backing index matches its stream's pattern;
  // the exclusion check has to see the same name, or an explicitly named
  // `.ds-logs-elastic_agent...` backing index would slip past `-logs-elastic_agent*`.
  const candidate = stripBackingPrefix(rawCandidate);
  if (!candidate.includes('*')) return compileGlobs([exclusion])[0].test(candidate);
  const a = literalPrefix(candidate);
  const b = literalPrefix(exclusion);
  return a.startsWith(b) || b.startsWith(a);
};

/**
 * True when `candidate` (a concrete `_index` or a pattern like
 * `logs-aws.cloudtrail-*`) cannot resolve outside `allowedPatterns`.
 *
 * A trailing `*` on the candidate is probed as `x` so `logs-aws.*` covers
 * `logs-aws.cloudtrail-*` but not the broader `logs-*` or an unrelated
 * `.kibana*`. Exclusion entries (`-logs-elastic_agent*`) then veto any
 * candidate whose expansion could touch them, including the positive
 * pattern itself: under a broad scope `logs-*` is not a source, only the
 * narrower patterns Tier 1 actually hit are. Cross-cluster sources
 * (`cluster:index`) are never allowed.
 */
export const isIndexPatternAllowed = (candidate: string, allowedPatterns: string[]): boolean => {
  if (!candidate || candidate === '*' || allowedPatterns.length === 0) return false;
  if (candidate.includes(':')) return false;
  // A generated exclusion is not a source; only positive entries can be named outright.
  if (isExclusion(candidate)) return false;
  const positives = allowedPatterns.filter((pattern) => !isExclusion(pattern));
  const exclusions = allowedPatterns.filter(isExclusion).map((pattern) => pattern.slice(1));
  const contained =
    positives.includes(candidate) || buildMatchesRequired(positives)(candidate.replace(/\*/g, 'x'));
  return contained && !exclusions.some((exclusion) => overlapsExclusion(candidate, exclusion));
};
