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
import {
  discoverHuntDatasets,
  HUNT_DISCOVERY_PATTERN,
  INTERNAL_DATASET_PREFIXES,
} from './discover_hunt_datasets';
import type { DiscoveredDataset } from './discover_hunt_datasets';
import { matchDatasetsDeterministic, matchDatasetsWithModel } from './match_hunt_datasets';
import type { HuntScopeReportContext, ModelDatasetMatch } from './match_hunt_datasets';

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

/** How the scope was produced, for messages and audit logs. */
export type HuntScopeResolution =
  | 'pinned' // explicit technology, present
  | 'static' // no technology given, at least one known technology present, no vendor/product match
  | 'discovered:deterministic' // report vendor/product matched a discovered dataset (wins over a present static technology)
  | 'discovered:model' // every known technology blocked; model match
  | 'discovered:broad' // every known technology blocked, no dataset matched, report has IOCs: Tier 1 searches every log source under the discovery pattern
  | 'blocked:pinned' // explicit technology, its required indices absent
  | 'blocked:no_report' // every known technology blocked, nothing to match against
  | 'blocked:discovery_failed' // listSearchSources threw (fail closed)
  | 'blocked:no_datasets' // discovery returned nothing
  | 'blocked:model_unavailable' // deterministic missed, no model was given, report has no IOCs
  | 'blocked:model_declined'; // deterministic missed, the model returned no accepted match, report has no IOCs

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
  resolution: HuntScopeResolution;
};

const uniq = (values: string[]): string[] => Array.from(new Set(values));

type DiscoveredResolution = Extract<HuntScopeResolution, `discovered:${string}`>;
type BlockedResolution = Extract<HuntScopeResolution, `blocked:${string}`>;

/** How many patterns a broad scope names in its log line before eliding the rest. */
const BROAD_LOG_SAMPLE_SIZE = 3;

/**
 * Logs how a scope was produced so a run's scope origin is auditable. A
 * usable scope logs at info with its patterns, plus every model score on the
 * model path so a model-chosen scope can be audited; a blocked one at debug.
 * A broad scope can span hundreds of datasets, so it logs the count and a
 * sample instead of the full list.
 */
const logResolution = (
  logger: Logger | undefined,
  scope: HuntScope,
  scored?: ModelDatasetMatch['scored']
): void => {
  if (scope.status === 'blocked') {
    logger?.debug(`Hunt scope blocked: ${scope.resolution}`);
    return;
  }
  if (scope.resolution === 'discovered:broad') {
    const sample = scope.index_patterns.slice(0, BROAD_LOG_SAMPLE_SIZE).join(', ');
    const elided = scope.index_patterns.length > BROAD_LOG_SAMPLE_SIZE ? ', ...' : '';
    logger?.info(
      `Hunt scope resolved via discovered:broad: ${scope.index_patterns.length} index pattern(s): ${sample}${elided}`
    );
    return;
  }
  const scores = scored?.map((entry) => `${entry.dataset}=${entry.confidence}`).join(', ');
  logger?.info(
    `Hunt scope resolved via ${scope.resolution}: ${scope.index_patterns.join(', ')}${
      scores ? ` (${scores})` : ''
    }`
  );
};

/**
 * Merges per-technology scopes into one static hunt scope. When none is
 * present the result is `blocked` and `missing` lists every checked pattern.
 * A blocked unpinned scope starts as `blocked:no_report`; the dynamic path in
 * `resolveHuntScope` narrows that when it gets to run.
 */
const mergeStaticScopes = (scopes: ResolvedIndexScope[], pinned: boolean): HuntScope => {
  const present = scopes.filter((scope) => scope.status !== 'blocked');
  const source = present.length > 0 ? present : scopes;
  const status = deriveStatus(
    present.length === 0,
    present.some((scope) => scope.status === 'degraded')
  );
  const required = uniq(source.flatMap((scope) => scope.required));
  const resolution: HuntScopeResolution =
    status === 'blocked'
      ? pinned
        ? 'blocked:pinned'
        : 'blocked:no_report'
      : pinned
        ? 'pinned'
        : 'static';

  return {
    technologies: present.map((scope) => scope.technology),
    status,
    required,
    optional: uniq(source.flatMap((scope) => scope.optional)),
    missing: uniq(source.flatMap((scope) => scope.missing)),
    // The wire contract says empty when blocked: `required` still names what was
    // checked (for `missing`), but nothing was hunted against it.
    index_patterns: status === 'blocked' ? [] : required,
    resolution,
    window: scopes[0].window,
    row_limit: scopes[0].row_limit,
  };
};

/**
 * The broad Tier 1 target: the discovery pattern with the agent-internal datasets
 * excluded, using the multi-target exclusion syntax both `_search` and `_count`
 * accept. Deliberately wider than the discovered dataset list: the pattern also
 * reaches plain indices and aliases under `logs-*` that are not data streams, which
 * discovery never lists because it parses `{type}-{dataset}-{namespace}` names. A
 * broad hunt is "every log source this user can see", and an IOC found in an
 * imported archive index is a real hit; Tier 2 then generates against the indices
 * that hit, not against the wildcard. Exclusion entries never match a backing index in `buildMatchesRequired`,
 * so they do not affect the hit bar; they only keep those streams out of the search.
 */
/**
 * Bounds on what a matched scope may hand Tier 1. `_search` and `_count` receive the
 * target list in the request path, and Elasticsearch's default initial-line limit
 * is 4 KB, so both the entry count and the serialized length are capped, leaving
 * room for the path itself and the space-derived alerts pattern. A match that does
 * not fit collapses first onto one `logs-<vendor>*` wildcard per matched vendor,
 * which still covers only the matched vendors, and only failing that onto the broad
 * target.
 */
export const MAX_SCOPE_TARGETS = 64;
/** Unencoded length; the client percent-encodes the separating commas, so this stays at half the limit. */
export const MAX_SCOPE_TARGET_CHARS = 2048;

const fitsRequestPath = (targets: string[]): boolean =>
  targets.length <= MAX_SCOPE_TARGETS && targets.join(',').length <= MAX_SCOPE_TARGET_CHARS;

/**
 * Two wildcards per matched vendor token, one for each character that can follow
 * the token in a dataset name: `logs-cisco_asa.*` for its streams and
 * `logs-cisco_asa-*` for a dataset that is the token alone. The full token is kept
 * on purpose: cutting it at `_` would turn a `cisco_asa` match into `cisco_*` and
 * pull unmatched `cisco_ise` streams (or `elastic_agent`, for an `elastic` match)
 * into the hit bar. Far fewer targets than the dataset list; sibling isolation
 * within a vendor token is given up, which is why the scope reads as degraded.
 */
export const vendorWildcards = (matches: DiscoveredDataset[]): string[] =>
  uniq(
    matches.flatMap((match) => {
      const type = match.index_pattern.split('-')[0];
      return ['.', '-'].map((separator) => `${type}-${match.vendor}${separator}*`);
    })
  );

export const broadSearchPatterns = (): string[] => [
  HUNT_DISCOVERY_PATTERN,
  ...INTERNAL_DATASET_PREFIXES.map((prefix) => `-logs-${prefix}*`),
];

/**
 * Builds a hunt scope from discovered datasets. A deterministic match is `ok`;
 * a model match is `degraded` since it is a weaker signal, and a broad scope
 * is always `degraded` since it was chosen by the absence of a better one.
 * The space-derived alerts pattern is the only optional; its absence degrades
 * the scope exactly as it does for a static technology. `missing` carries the
 * static patterns that were checked and absent so the caller can still see
 * what was looked for.
 */
const buildDiscoveredScope = async ({
  esClient,
  spaceId,
  matches,
  blocked,
  resolution,
  logger,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  matches: DiscoveredDataset[];
  blocked: HuntScope;
  resolution: DiscoveredResolution;
  logger?: Logger;
}): Promise<HuntScope> => {
  const alertsPattern = alertsIndexPattern(spaceId);
  const [, alertsPresent] = await checkPattern(esClient, alertsPattern);
  // `search_patterns`, not `index_pattern`: a dataset whose name a sibling extends with a
  // dash searches its own namespaces so the sibling's streams stay out of scope. A broad
  // scope is every discovered dataset, and discovery is uncapped, so it is expressed as
  // one bounded wildcard with the internal datasets excluded rather than as the list:
  // the client puts the index list in the request path, and a hundred-odd patterns
  // already exceed Elasticsearch's default initial-line limit.
  // A broad scope never names its datasets; a matched scope has to fit the request path.
  const matchedTargets =
    resolution === 'discovered:broad'
      ? []
      : uniq(matches.flatMap((match) => match.search_patterns));
  let required: string[];
  let collapsed = false;
  if (resolution === 'discovered:broad') {
    required = broadSearchPatterns();
  } else if (fitsRequestPath(matchedTargets)) {
    required = matchedTargets;
  } else {
    // Too wide to name one by one. Fall back to wildcards per matched vendor token, which
    // keeps unmatched vendors out of the hit bar, and only then to the broad target.
    const byVendor = vendorWildcards(matches);
    const useVendor = fitsRequestPath(byVendor);
    required = useVendor ? byVendor : broadSearchPatterns();
    collapsed = true;
    logger?.warn(
      `Hunt scope matched ${matchedTargets.length} index patterns (${
        matchedTargets.join(',').length
      } chars), more than a request may carry; searching ${
        useVendor
          ? `${byVendor.length} vendor wildcard(s)`
          : `the bounded ${HUNT_DISCOVERY_PATTERN} target`
      } instead`
    );
  }
  // A match that had to be collapsed is wider than what matched and reads as degraded,
  // whichever matcher produced it.
  const status = resolution === 'discovered:deterministic' && !collapsed ? 'ok' : 'degraded';

  return {
    technologies: [],
    status: alertsPresent ? status : 'degraded',
    required,
    optional: [alertsPattern],
    missing: uniq([...blocked.missing, ...(alertsPresent ? [] : [alertsPattern])]),
    index_patterns: required,
    resolution,
    window: blocked.window,
    row_limit: blocked.row_limit,
  };
};

/**
 * Resolves the hunt scope for a space.
 *
 * With an explicit `technology` it resolves that one entry and stops. Without
 * one it resolves every known technology (cheap; this also supplies `window`,
 * `row_limit`, and `missing`) and then, when a `report` is given, walks:
 *
 * 1. Vendor match, only when the report names a `vendor` or `product`:
 *    `discoverHuntDatasets` lists the cluster's log datasets and a
 *    deterministic vendor/product match yields an `ok` scope, even when a
 *    known technology is present, since a vendor match is the stronger
 *    signal. If discovery throws here and a static scope is present, the leg
 *    is skipped with a warning and the static scope is kept.
 * 2. Static: at least one known technology's required indices exist.
 * 3. Model: every known technology is blocked, so a `model` (if given) picks
 *    datasets for a `degraded` scope, a weaker signal than a vendor match.
 * 4. Broad Tier 1, only when the report carries IOCs: the model was
 *    unavailable or declined, so the scope is every discovered dataset,
 *    always `degraded` since it was chosen by the absence of a better one.
 * 5. Blocked (fail closed): no report, discovery error, no datasets, or no
 *    match and no IOCs.
 *
 * A report with no vendor and no product never triggers discovery while a
 * known technology is present. Discovery runs at most once per resolution. A
 * discovered scope has no `technologies`.
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
  const staticScope = mergeStaticScopes(scopes, technology !== undefined);
  const finish = (scope: HuntScope, scored?: ModelDatasetMatch['scored']): HuntScope => {
    logResolution(logger, scope, scored);
    return scope;
  };
  const blocked = (resolution: BlockedResolution): HuntScope =>
    finish({ ...staticScope, resolution });

  // Pinned and no-report scopes already carry their resolution.
  if (technology || !report) return finish(staticScope);

  const staticPresent = staticScope.status !== 'blocked';
  // A report that names neither vendor nor product has nothing for the
  // deterministic matcher to beat a present technology with, so it never
  // pays for discovery: static-first, byte for byte.
  const namesSubject = Boolean(report.vendor || report.product);
  if (staticPresent && !namesSubject) return finish(staticScope);

  let datasets: DiscoveredDataset[];
  try {
    datasets = await discoverHuntDatasets({ esClient, logger });
  } catch (err) {
    const message = (err as Error).message;
    if (staticPresent) {
      logger?.warn(
        `Hunt dataset discovery failed; vendor-first leg skipped, keeping the static scope: ${message}`
      );
      return finish(staticScope);
    }
    logger?.warn(`Hunt dataset discovery failed; scope stays blocked: ${message}`);
    return blocked('blocked:discovery_failed');
  }
  // Nothing matched (or nothing to match). With searchable IOCs the hunt can still run
  // Tier 1 across every log source; without them there is nothing to search for broadly. The
  // coordinator hands over only IOCs Tier 1 can query, so a non-empty list here
  // means at least one clause will be built.
  const blockedOrBroad = async (resolution: BlockedResolution): Promise<HuntScope> => {
    if (!report.iocs || report.iocs.length === 0) return blocked(resolution);
    return finish(
      await buildDiscoveredScope({
        esClient,
        spaceId,
        matches: datasets,
        blocked: staticScope,
        logger,
        resolution: 'discovered:broad',
      })
    );
  };

  if (datasets.length === 0) {
    if (staticPresent) return finish(staticScope);
    // Discovery lists data streams only, but the broad target is the whole `logs-*`
    // space: a plain index or alias under it (an imported archive) is still a place
    // an IOC can be searched. Only when nothing at all answers to the discovery
    // pattern is there truly nothing to hunt. An estate whose only `logs-*` sources
    // are the excluded agent-internal streams passes this check and goes broad, and
    // Tier 1 then reports `index_unavailable` (retryable) because the exclusions leave
    // the required target backed by no index; it never reads as searched-and-clean.
    const [, anyLogSource] = await checkPattern(esClient, HUNT_DISCOVERY_PATTERN);
    return anyLogSource ? blockedOrBroad('blocked:no_datasets') : blocked('blocked:no_datasets');
  }

  const deterministic = matchDatasetsDeterministic({
    datasets,
    vendor: report.vendor,
    product: report.product,
  });
  if (deterministic.length > 0) {
    return finish(
      await buildDiscoveredScope({
        esClient,
        spaceId,
        matches: deterministic,
        blocked: staticScope,
        logger,
        resolution: 'discovered:deterministic',
      })
    );
  }
  if (staticPresent) return finish(staticScope);

  if (!model) return blockedOrBroad('blocked:model_unavailable');
  const modelMatch = await matchDatasetsWithModel({ model, datasets, report, logger });
  if (!modelMatch || modelMatch.matches.length === 0) {
    return blockedOrBroad('blocked:model_declined');
  }

  return finish(
    await buildDiscoveredScope({
      esClient,
      spaceId,
      matches: modelMatch.matches,
      blocked: staticScope,
      logger,
      resolution: 'discovered:model',
    }),
    modelMatch.scored
  );
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
