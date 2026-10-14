/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesResolveIndexResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { HuntScope, HuntScopeResolution, IndexScopeWindow } from '@kbn/alertzero-common';
import { classifyActionableIndices } from './classify_actionable_indices';
import { discoverHuntDatasets } from './discover_hunt_datasets';
import type { DiscoveredDataset } from './discover_hunt_datasets';
import { buildMatchesRequired } from './matches_required';
import { matchDatasetsDeterministic } from './match_hunt_datasets';
import type { HuntScopeReportContext } from './match_hunt_datasets';
import { fitsRequestPath, vendorWildcards } from './scope_bounds';

/** Default lookback window: 30 days. */
const DEFAULT_WINDOW_DAYS = 30;

/** Default row limit per search. */
const DEFAULT_ROW_LIMIT = 25;

/**
 * The wire `HuntScope` plus the datasets stage 1 discovered, which stay server-side.
 * Stage 1 of hunt scoping: it runs before Tier 1 and reads only the caller's universe,
 * never an alerts index or a seed list.
 */
export interface ResolvedHuntScope extends HuntScope {
  /** Datasets discovered inside the universe (data streams only). */
  discovered: DiscoveredDataset[];
}

const uniq = (values: string[]): string[] => Array.from(new Set(values));

const defaultWindow = (): IndexScopeWindow => ({
  from: new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  to: new Date().toISOString(),
});

const isExclusion = (pattern: string): boolean => pattern.startsWith('-');

/**
 * The universe patterns no resolved name globs to. A name counts whether it resolved as an
 * index, an alias, a data stream, or a data stream's backing index.
 */
const unresolvedPatterns = (
  patterns: string[],
  resolved: IndicesResolveIndexResponse
): string[] => {
  const names = [
    ...resolved.indices.map(({ name }) => name),
    ...resolved.aliases.map(({ name }) => name),
    ...resolved.data_streams.flatMap(({ name, backing_indices: backing }) => [name, ...backing]),
  ];
  return patterns.filter((pattern) => !names.some(buildMatchesRequired([pattern])));
};

/**
 * The report's deterministic matches as a bounded target list. A list that does not fit
 * the request path collapses onto one wildcard pair per matched vendor, which still covers
 * only the matched vendors; one that still does not fit is dropped rather than sent.
 */
const boundReportMatches = (
  matches: DiscoveredDataset[],
  logger?: Logger
): { patterns: string[]; collapsed: boolean } => {
  const targets = uniq(matches.flatMap((match) => match.search_patterns));
  if (fitsRequestPath(targets)) return { patterns: targets, collapsed: false };

  const byVendor = vendorWildcards(matches);
  const fits = fitsRequestPath(byVendor);
  logger?.warn(
    `Hunt report matched ${targets.length} index patterns (${
      targets.join(',').length
    } chars), more than a request may carry; ${
      fits ? `keeping ${byVendor.length} vendor wildcard(s)` : 'keeping none'
    }`
  );
  return { patterns: fits ? byVendor : [], collapsed: true };
};

/**
 * Resolves the hunt scope for a space from the caller's universe: the space's Security
 * Solution default data view patterns, exclusions included.
 *
 * One `_resolve/index` call over the universe answers whether anything is visible
 * (`blocked:empty_universe` when nothing is), which patterns resolved nothing
 * (`missing`), and which data streams discovery parses into datasets. The report's vendor
 * and product are then matched deterministically against those datasets, and one
 * `_field_caps` call names the `actionable_indices`. Nothing here picks what Tier 1 may
 * read: Tier 1 searches the universe as given. The model matcher is not called here; it
 * runs in stage 2, after Tier 1, only when the deterministic signals found nothing.
 *
 * `status` is `degraded` when `_field_caps` failed or a bounded list had to collapse.
 * `_resolve/index` failing blocks (fail closed).
 */
export const resolveHuntScope = async ({
  esClient,
  spaceId,
  indexPatterns,
  window,
  row_limit = DEFAULT_ROW_LIMIT,
  report,
  logger,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  /** The space's default data view patterns, exclusions included. Caller-supplied. */
  indexPatterns: string[];
  window?: IndexScopeWindow;
  row_limit?: number;
  report?: HuntScopeReportContext;
  logger?: Logger;
}): Promise<ResolvedHuntScope> => {
  const resolvedWindow = window ?? defaultWindow();
  const positivePatterns = indexPatterns.filter((pattern) => !isExclusion(pattern));
  const blocked = (
    resolution: Extract<HuntScopeResolution, `blocked:${string}`>,
    missing: string[]
  ): ResolvedHuntScope => {
    logger?.debug(`Hunt scope for space ${spaceId} blocked: ${resolution}`);
    return {
      status: 'blocked',
      resolution,
      index_patterns: [],
      missing,
      discovered: [],
      report_matches: [],
      actionable_indices: [],
      window: resolvedWindow,
      row_limit,
    };
  };

  // An empty name would resolve every index, not none: nothing to hunt without a pattern.
  if (positivePatterns.length === 0) return blocked('blocked:empty_universe', []);

  let resolved: IndicesResolveIndexResponse;
  try {
    resolved = await esClient.indices.resolveIndex({
      name: indexPatterns,
      allow_no_indices: true,
      expand_wildcards: ['open'],
    });
  } catch (err) {
    logger?.warn(
      `Hunt universe resolution failed for space ${spaceId}; scope stays blocked: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return blocked('blocked:discovery_failed', []);
  }

  const missing = unresolvedPatterns(positivePatterns, resolved);
  if (
    resolved.indices.length === 0 &&
    resolved.data_streams.length === 0 &&
    resolved.aliases.length === 0
  ) {
    return blocked('blocked:empty_universe', missing);
  }

  const discovered = await discoverHuntDatasets({
    esClient,
    patterns: indexPatterns,
    logger,
    resolved,
  });
  const matches = matchDatasetsDeterministic({
    datasets: discovered,
    vendor: report?.vendor,
    product: report?.product,
  });
  const reportMatches = boundReportMatches(matches, logger);
  const actionable = await classifyActionableIndices({ esClient, indexPatterns, logger });

  const degraded = actionable.degraded || reportMatches.collapsed;
  logger?.info(
    `Hunt scope resolved for space ${spaceId}: ${positivePatterns.length} universe pattern(s), ${discovered.length} dataset(s), ${reportMatches.patterns.length} report match pattern(s), ${actionable.patterns.length} actionable pattern(s)`
  );
  return {
    status: degraded ? 'degraded' : 'ok',
    resolution: 'universe',
    index_patterns: indexPatterns,
    missing,
    discovered,
    report_matches: reportMatches.patterns,
    actionable_indices: actionable.patterns,
    window: resolvedWindow,
    row_limit,
  };
};
