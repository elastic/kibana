/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { HuntTechnology, IndexScopeWindow, ResolvedIndexScope } from '@kbn/alertzero-common';
import { HUNT_ALERTS_INDEX_PATTERN_PREFIX } from '../../../../../common/constants';

/** Default lookback window: 30 days. */
const DEFAULT_WINDOW_DAYS = 30;

/** Default row limit per search. */
const DEFAULT_ROW_LIMIT = 25;

/**
 * Per-technology index pattern requirements.
 *
 * `required`: patterns the hunt cannot run without — zero resolved required
 * patterns means `blocked`.
 * `optional`: extension patterns whose absence only degrades coverage.
 * `.alerts-security.alerts-{spaceId}` is appended by `resolveIndexScope`
 * for every technology since it is space-derived, not technology-derived.
 *
 * Adding a technology means adding both a `HuntTechnology` union member and
 * an entry here; the type system will not do it for you.
 */
const TECHNOLOGY_INDEX_MAP: Record<HuntTechnology, { required: string[]; optional: string[] }> = {
  aws_iam: {
    required: ['logs-aws.*'],
    optional: ['logs-endpoint.events.*'],
  },
  fortigate: {
    required: ['logs-fortinet.*'],
    optional: [],
  },
};

const alertsIndexPattern = (spaceId: string): string =>
  `${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${spaceId}`;

const defaultWindow = (): IndexScopeWindow => ({
  from: new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  to: new Date().toISOString(),
});

const deriveStatus = (blocked: boolean, degraded: boolean): ResolvedIndexScope['status'] =>
  blocked ? 'blocked' : degraded ? 'degraded' : 'ok';

/**
 * Resolves whether a technology's target indices actually exist in the given
 * space. Every pattern — required, optional, and the space-derived alerts
 * pattern — is checked with `resolveIndex` so a missing integration reads as
 * `blocked` or `degraded` instead of a hunt silently querying nothing.
 */
export const resolveIndexScope = async ({
  esClient,
  technology,
  spaceId,
  window,
  row_limit = DEFAULT_ROW_LIMIT,
}: {
  esClient: ElasticsearchClient;
  technology: HuntTechnology;
  spaceId: string;
  window?: IndexScopeWindow;
  row_limit?: number;
}): Promise<ResolvedIndexScope> => {
  const { required, optional } = TECHNOLOGY_INDEX_MAP[technology];
  const alertsPattern = alertsIndexPattern(spaceId);
  const resolvedWindow = window ?? defaultWindow();

  // A wildcard that matches nothing resolves to an empty list, but a concrete
  // name that does not exist (the space-derived alerts index before any alert
  // is written there) is a 404 unless `ignore_unavailable` is set. Either way
  // the answer is "absent", never an error.
  const checkPattern = async (pattern: string): Promise<[string, boolean]> => {
    try {
      const response = await esClient.indices.resolveIndex({
        name: pattern,
        expand_wildcards: 'open',
        ignore_unavailable: true,
      });
      return [pattern, response.indices.length > 0 || response.data_streams.length > 0];
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) return [pattern, false];
      throw err;
    }
  };

  const [requiredResults, optionalResults] = await Promise.all([
    Promise.all(required.map(checkPattern)),
    Promise.all([...optional, alertsPattern].map(checkPattern)),
  ]);

  const missing: string[] = [];
  for (const [pattern, present] of [...requiredResults, ...optionalResults]) {
    if (!present) {
      missing.push(pattern);
    }
  }

  // Every required pattern must resolve; `.some` would mark a multi-required
  // technology `ok`/`degraded` while still listing a missing required pattern.
  const hasAllRequired = requiredResults.every(([, present]) => present);
  const missingOptionalCount = optionalResults.filter(([, present]) => !present).length;
  const status = deriveStatus(!hasAllRequired, missingOptionalCount > 0);

  return {
    technology,
    required,
    optional: [...optional, alertsPattern],
    missing,
    status,
    window: resolvedWindow,
    row_limit,
  };
};

/** Every technology the hunt knows how to scope. Derived from the map so the two cannot drift. */
export const HUNT_TECHNOLOGIES = Object.keys(TECHNOLOGY_INDEX_MAP) as HuntTechnology[];

/**
 * The scope a hunt actually runs against: one or more technologies' patterns
 * merged. `technologies` lists the technologies whose required indices exist in
 * the space; empty means nothing resolved and the hunt must not run.
 */
export type HuntScope = Omit<ResolvedIndexScope, 'technology'> & {
  technologies: HuntTechnology[];
};

const uniq = (values: string[]): string[] => Array.from(new Set(values));

/**
 * Resolves the hunt scope for a space. With an explicit `technology` it resolves
 * that one entry. Without one it resolves every known technology and keeps the
 * ones whose required indices exist, so a hunt never assumes a vendor the
 * environment does not have; when none are present the result is `blocked` and
 * `missing` lists every pattern that was checked.
 */
export const resolveHuntScope = async ({
  esClient,
  spaceId,
  technology,
  window,
  row_limit,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  technology?: HuntTechnology;
  window?: IndexScopeWindow;
  row_limit?: number;
}): Promise<HuntScope> => {
  const candidates = technology ? [technology] : HUNT_TECHNOLOGIES;
  const scopes = await Promise.all(
    candidates.map((candidate) =>
      resolveIndexScope({ esClient, technology: candidate, spaceId, window, row_limit })
    )
  );
  const present = scopes.filter((scope) => scope.status !== 'blocked');
  const source = present.length > 0 ? present : scopes;
  const status = deriveStatus(
    present.length === 0,
    present.some((scope) => scope.status === 'degraded')
  );

  return {
    technologies: present.map((scope) => scope.technology),
    status,
    required: uniq(source.flatMap((scope) => scope.required)),
    optional: uniq(source.flatMap((scope) => scope.optional)),
    missing: uniq(source.flatMap((scope) => scope.missing)),
    window: scopes[0].window,
    row_limit: scopes[0].row_limit,
  };
};

const isHuntTechnology = (value: string): value is HuntTechnology =>
  (HUNT_TECHNOLOGIES as string[]).includes(value);

/**
 * Interprets a caller-supplied `technology`: undefined, null, and the empty
 * string all mean "resolve from the environment" (a workflow renders an unset
 * input as ""), a known technology pins the hunt, anything else is invalid.
 */
export const parseTechnologyInput = (
  value: string | null | undefined
): { technology?: HuntTechnology } | { invalid: string } => {
  if (value === undefined || value === null || value === '') return {};
  return isHuntTechnology(value) ? { technology: value } : { invalid: value };
};
