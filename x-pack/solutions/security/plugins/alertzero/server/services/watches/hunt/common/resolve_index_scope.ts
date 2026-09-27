/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { HuntTechnology, IndexScopeWindow, ResolvedIndexScope } from '@kbn/alertzero-common';
import { HUNT_ALERTS_INDEX_PATTERN_PREFIX } from '../../../../../common/constants';
import { discoverHuntDatasets } from './discover_hunt_datasets';
import type { DiscoveredDataset } from './discover_hunt_datasets';
import { matchDatasetsDeterministic, matchDatasetsWithModel } from './match_hunt_datasets';
import type { HuntScopeReportContext } from './match_hunt_datasets';

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
 * Checks whether a single pattern resolves to anything in the cluster.
 *
 * A wildcard that matches nothing resolves to an empty list, but a concrete
 * name that does not exist (the space-derived alerts index before any alert
 * is written there) is a 404 unless `ignore_unavailable` is set. Either way
 * the answer is "absent", never an error. A name can resolve as an index, a
 * data stream, or an alias: `.alerts-security.alerts-{space}` is an alias
 * over the hidden `.internal.alerts-*` write index, so it only ever shows up
 * under `aliases`.
 */
const checkPattern = async (
  esClient: ElasticsearchClient,
  pattern: string
): Promise<[string, boolean]> => {
  try {
    const response = await esClient.indices.resolveIndex({
      name: pattern,
      expand_wildcards: 'open',
      ignore_unavailable: true,
    });
    return [
      pattern,
      response.indices.length > 0 ||
        response.data_streams.length > 0 ||
        response.aliases.length > 0,
    ];
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 404) return [pattern, false];
    throw err;
  }
};

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

  const [requiredResults, optionalResults] = await Promise.all([
    Promise.all(required.map((pattern) => checkPattern(esClient, pattern))),
    Promise.all([...optional, alertsPattern].map((pattern) => checkPattern(esClient, pattern))),
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
 * Required + optional patterns from every known technology (no space-derived
 * alerts pattern). Used to allowlist caller-supplied Tier 2 generation targets
 * when the hunt has no resolved required-index scope yet.
 */
export const getKnownHuntIndexPatterns = (): string[] =>
  Array.from(
    new Set(
      Object.values(TECHNOLOGY_INDEX_MAP).flatMap((entry) => [...entry.required, ...entry.optional])
    )
  );

/**
 * The scope a hunt actually runs against: one or more technologies' patterns
 * merged, or patterns discovered from the cluster when no known technology is
 * present. `technologies` lists the known technologies whose required indices
 * exist in the space; it is empty for a discovered scope and for a blocked one.
 */
export type HuntScope = Omit<ResolvedIndexScope, 'technology'> & {
  technologies: HuntTechnology[];
  /**
   * The resolved `required` patterns, set on every path (static, discovered,
   * blocked). This is what the coordinator reports on the wire.
   */
  index_patterns: string[];
};

const uniq = (values: string[]): string[] => Array.from(new Set(values));

/** Which path produced a hunt scope; logged so a run's scope origin is auditable. */
type HuntScopeSource = 'static' | 'discovered:deterministic' | 'discovered:model';

const logScopeSource = (logger: Logger | undefined, source: HuntScopeSource, count: number) =>
  logger?.info(`Hunt scope resolved via ${source} (${count} index pattern(s))`);

/**
 * Merges per-technology scopes into one static hunt scope. When none is
 * present the result is `blocked` and `missing` lists every checked pattern.
 */
const mergeStaticScopes = (scopes: ResolvedIndexScope[]): HuntScope => {
  const present = scopes.filter((scope) => scope.status !== 'blocked');
  const source = present.length > 0 ? present : scopes;
  const status = deriveStatus(
    present.length === 0,
    present.some((scope) => scope.status === 'degraded')
  );
  const required = uniq(source.flatMap((scope) => scope.required));

  return {
    technologies: present.map((scope) => scope.technology),
    status,
    required,
    optional: uniq(source.flatMap((scope) => scope.optional)),
    missing: uniq(source.flatMap((scope) => scope.missing)),
    index_patterns: required,
    window: scopes[0].window,
    row_limit: scopes[0].row_limit,
  };
};

/**
 * Builds a hunt scope from discovered datasets. The space-derived alerts
 * pattern is the only optional; its absence degrades the scope exactly as it
 * does for a static technology. `missing` carries the static patterns that
 * were checked and absent so the caller can still see what was looked for.
 */
const buildDiscoveredScope = async ({
  esClient,
  spaceId,
  matches,
  blocked,
  status,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  matches: DiscoveredDataset[];
  blocked: HuntScope;
  status: 'ok' | 'degraded';
}): Promise<HuntScope> => {
  const alertsPattern = alertsIndexPattern(spaceId);
  const [, alertsPresent] = await checkPattern(esClient, alertsPattern);
  const required = uniq(matches.map((match) => match.index_pattern));

  return {
    technologies: [],
    status: alertsPresent ? status : 'degraded',
    required,
    optional: [alertsPattern],
    missing: uniq([...blocked.missing, ...(alertsPresent ? [] : [alertsPattern])]),
    index_patterns: required,
    window: blocked.window,
    row_limit: blocked.row_limit,
  };
};

/**
 * Resolves the hunt scope for a space, static first.
 *
 * With an explicit `technology` it resolves that one entry. Without one it
 * resolves every known technology and keeps the ones whose required indices
 * exist, so a hunt never assumes a vendor the environment does not have.
 *
 * Only when every known technology is blocked and a `report` is given does it
 * fall through to discovery: `discoverHuntDatasets` lists the cluster's log
 * datasets, a deterministic vendor/product match yields an `ok` scope, and
 * failing that a `model` (if given) picks datasets for a `degraded` scope,
 * since a model-chosen scope is a weaker signal. Anything else, including a
 * discovery error, is `blocked` (fail closed); there is no broad `logs-*`
 * fallback. A discovered scope has no `technologies`.
 */
export const resolveHuntScope = async ({
  esClient,
  spaceId,
  technology,
  window,
  row_limit,
  report,
  model,
  logger,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  technology?: HuntTechnology;
  window?: IndexScopeWindow;
  row_limit?: number;
  report?: HuntScopeReportContext;
  model?: ScopedModel;
  logger?: Logger;
}): Promise<HuntScope> => {
  const candidates = technology ? [technology] : HUNT_TECHNOLOGIES;
  const scopes = await Promise.all(
    candidates.map((candidate) =>
      resolveIndexScope({ esClient, technology: candidate, spaceId, window, row_limit })
    )
  );
  const staticScope = mergeStaticScopes(scopes);
  if (staticScope.status !== 'blocked') {
    logScopeSource(logger, 'static', staticScope.index_patterns.length);
    return staticScope;
  }
  if (technology || !report) return staticScope;

  let datasets: DiscoveredDataset[];
  try {
    datasets = await discoverHuntDatasets({ esClient, logger });
  } catch (err) {
    logger?.warn(`Hunt dataset discovery failed; scope stays blocked: ${(err as Error).message}`);
    return staticScope;
  }
  if (datasets.length === 0) return staticScope;

  const deterministic = matchDatasetsDeterministic({
    datasets,
    vendor: report.vendor,
    product: report.product,
  });
  if (deterministic.length > 0) {
    const scope = await buildDiscoveredScope({
      esClient,
      spaceId,
      matches: deterministic,
      blocked: staticScope,
      status: 'ok',
    });
    logScopeSource(logger, 'discovered:deterministic', scope.index_patterns.length);
    return scope;
  }

  if (!model) return staticScope;
  const modelMatch = await matchDatasetsWithModel({ model, datasets, report, logger });
  if (!modelMatch || modelMatch.matches.length === 0) return staticScope;

  const scope = await buildDiscoveredScope({
    esClient,
    spaceId,
    matches: modelMatch.matches,
    blocked: staticScope,
    status: 'degraded',
  });
  logScopeSource(logger, 'discovered:model', scope.index_patterns.length);
  return scope;
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
