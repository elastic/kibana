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
export const buildMatchesRequired = (requiredPatterns: string[]): ((index: string) => boolean) => {
  const patterns = requiredPatterns.map(
    (pattern) => new RegExp(`^${pattern.split('*').map(escapeRegExpLiteral).join('.*')}$`)
  );
  return (index: string): boolean => {
    const concrete = index.startsWith(DATA_STREAM_BACKING_PREFIX)
      ? index.slice(DATA_STREAM_BACKING_PREFIX.length)
      : index;
    return patterns.some((pattern) => pattern.test(concrete));
  };
};

/**
 * True when `candidate` (a concrete `_index` or a pattern like
 * `logs-aws.cloudtrail-*`) cannot resolve outside `allowedPatterns`.
 *
 * A trailing `*` on the candidate is probed as `x` so `logs-aws.*` covers
 * `logs-aws.cloudtrail-*` but not the broader `logs-*` or an unrelated
 * `.kibana*`. Cross-cluster sources (`cluster:index`) are never allowed.
 */
export const isIndexPatternAllowed = (candidate: string, allowedPatterns: string[]): boolean => {
  if (!candidate || candidate === '*' || allowedPatterns.length === 0) return false;
  if (candidate.includes(':')) return false;
  if (allowedPatterns.includes(candidate)) return true;
  return buildMatchesRequired(allowedPatterns)(candidate.replace(/\*/g, 'x'));
};
