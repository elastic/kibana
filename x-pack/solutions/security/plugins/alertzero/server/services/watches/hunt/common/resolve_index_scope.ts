/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesResolveIndexResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { HuntScope, HuntScopeResolution, IndexScopeWindow } from '@kbn/alertzero-common';
import {
  isIndexExclusion,
  parseIndexScopeEntry,
  stripBackingPrefix,
} from '../../../../../common/remote_cluster';
import { classifyActionableIndices } from './classify_actionable_indices';
import { HUNT_RESOLVE_INDEX_OPTIONS } from './hunt_resolve_index_options';
import { discoverHuntDatasets } from './discover_hunt_datasets';
import type { DiscoveredDataset } from './discover_hunt_datasets';
import { scopeGuardPatterns } from './cps_scope';
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
 * never a seed list.
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

/**
 * The universe patterns no searchable resolved name globs to. A name counts whether it resolved
 * as an index, an alias, a data stream, or a data stream's backing index. A closed index does
 * not count: it resolves when named, and no search can read it.
 */
export const unresolvedPatterns = (
  patterns: string[],
  resolved: IndicesResolveIndexResponse,
  crossProjectSearch = false
): string[] => {
  const names = [
    ...resolved.indices
      .filter(({ attributes }) => !attributes?.includes('closed'))
      .map(({ name }) => name),
    ...resolved.aliases.map(({ name }) => name),
    ...resolved.data_streams.flatMap(({ name, backing_indices: backing }) => [name, ...backing]),
  ];
  return patterns.filter(
    (pattern) =>
      !names.some(
        buildMatchesRequired(scopeGuardPatterns([stripBackingPrefix(pattern)], crossProjectSearch))
      )
  );
};

/** The resolve response without the dropped names, so discovery never offers a stream no search reads. */
const withoutNames = (
  resolved: IndicesResolveIndexResponse,
  dropped: Set<string>
): IndicesResolveIndexResponse =>
  dropped.size === 0
    ? resolved
    : {
        indices: resolved.indices.filter(({ name }) => !dropped.has(name)),
        aliases: resolved.aliases.filter(({ name }) => !dropped.has(name)),
        data_streams: resolved.data_streams.filter(({ name }) => !dropped.has(name)),
      };

/**
 * Whether an entry in `missing` may leave the searched list: a local concrete name. Wildcards,
 * `_all`, remote-qualified names, date math, selectors and comma lists stay, because a miss for
 * one of those does not show the name is unreadable (a remote that is down resolves nothing
 * too). `_all` is a wildcard by another spelling: no resolved name ever equals it.
 */
const isPrunableConcreteName = (entry: string): boolean => {
  const { cluster, index } = parseIndexScopeEntry(entry);
  return (
    cluster === undefined &&
    !index.includes('*') &&
    index !== '_all' &&
    !entry.startsWith('<') &&
    !entry.includes('::') &&
    !entry.includes(',')
  );
};

/**
 * The resolved local concrete names the caller may not read. Resolving a name needs only
 * `view_index_metadata`, so such a name resolves, a search with `ignore_unavailable` then
 * skips it without a word, and an ES|QL `FROM` naming it fails whole. Privileges are checked
 * by name, so a `.ds-` backing index (readable through a grant on its data stream) is left
 * out, and so is every name under cross-project search, where the local answer does not
 * speak for a linked project. A failed check drops nothing.
 */
const unreadableConcreteNames = async ({
  esClient,
  resolvedPatterns,
  crossProjectSearch,
  spaceId,
  logger,
}: {
  esClient: ElasticsearchClient;
  /** Positive universe entries that resolved. */
  resolvedPatterns: string[];
  crossProjectSearch: boolean;
  spaceId: string;
  logger?: Logger;
}): Promise<string[]> => {
  if (crossProjectSearch) return [];
  const names = uniq(
    resolvedPatterns.filter(
      (pattern) => isPrunableConcreteName(pattern) && stripBackingPrefix(pattern) === pattern
    )
  );
  if (names.length === 0) return [];
  try {
    const { index } = await esClient.security.hasPrivileges({
      index: [{ names, privileges: ['read'] }],
    });
    return names.filter((name) => index[name]?.read === false);
  } catch (err) {
    logger?.warn(
      `Checking read access to the concrete names of the hunt universe failed for space ${spaceId}; none is dropped: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  }
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
 * (`missing`), and which data streams discovery parses into datasets. One
 * `_has_privileges` call then adds to `missing` the concrete names that resolved but
 * that the caller may not read; it is skipped when the universe names none. The report's vendor
 * and product are then matched deterministically against those datasets, and one
 * `_field_caps` call names the `actionable_indices`. Nothing here picks what Tier 1 may
 * read: Tier 1 searches the universe minus the local concrete names in `missing`
 * (under cross-project search nothing is removed, since a miss may be a linked project that did not answer).
 * The model matcher is not called here; it runs in stage 2, after Tier 1, only when the
 * deterministic signals found nothing.
 *
 * `status` is `degraded` when `_field_caps` failed or a bounded list had to collapse.
 * The resolve is lenient about a concrete name the caller cannot read; a throw still blocks
 * (fail closed).
 */
export const resolveHuntScope = async ({
  esClient,
  spaceId,
  indexPatterns,
  crossProjectSearch = false,
  window,
  row_limit = DEFAULT_ROW_LIMIT,
  report,
  logger,
  policySkippedPatterns = [],
  resolveOnly = false,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  /** The space's default data view patterns, exclusions included. Caller-supplied. */
  indexPatterns: string[];
  /** Entries the caller removed by policy (dot-prefixed names), echoed as `policy_skipped`. */
  policySkippedPatterns?: string[];
  /** Stop after the resolve and read checks: no dataset discovery and no `_field_caps` call. */
  resolveOnly?: boolean;
  /** Cross-project search is on: an unqualified pattern resolving only on a linked project is not missing. */
  crossProjectSearch?: boolean;
  window?: IndexScopeWindow;
  row_limit?: number;
  report?: HuntScopeReportContext;
  logger?: Logger;
}): Promise<ResolvedHuntScope> => {
  const resolvedWindow = window ?? defaultWindow();
  const positivePatterns = indexPatterns.filter((pattern) => !isIndexExclusion(pattern));
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
      policy_skipped: policySkippedPatterns,
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
      ...HUNT_RESOLVE_INDEX_OPTIONS,
    });
  } catch (err) {
    logger?.warn(
      `Hunt universe resolution failed for space ${spaceId}; scope stays blocked: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return blocked('blocked:discovery_failed', []);
  }

  const unresolved = unresolvedPatterns(positivePatterns, resolved, crossProjectSearch);
  if (
    resolved.indices.length === 0 &&
    resolved.data_streams.length === 0 &&
    resolved.aliases.length === 0
  ) {
    return blocked('blocked:empty_universe', unresolved);
  }

  const notSearchable = new Set(unresolved);
  const unreadable = await unreadableConcreteNames({
    esClient,
    resolvedPatterns: positivePatterns.filter((pattern) => !notSearchable.has(pattern)),
    crossProjectSearch,
    spaceId,
    logger,
  });
  unreadable.forEach((name) => notSearchable.add(name));
  const missing = positivePatterns.filter((pattern) => notSearchable.has(pattern));

  // A local concrete name the caller cannot search (it resolved nothing, is closed, or is not
  // readable) is dropped from the list and stays in `missing`, so no search names it. Under
  // cross-project search a name that resolved nothing may live in a linked project that did not
  // answer, so nothing is dropped and the miss is not recorded as a final gap.
  const dropped = new Set(crossProjectSearch ? [] : missing.filter(isPrunableConcreteName));
  const searched = indexPatterns.filter((pattern) => !dropped.has(pattern));
  if (!searched.some((pattern) => !isIndexExclusion(pattern))) {
    return blocked('blocked:empty_universe', missing);
  }

  if (resolveOnly) {
    return {
      status: 'ok',
      resolution: 'universe',
      index_patterns: searched,
      missing,
      policy_skipped: policySkippedPatterns,
      discovered: [],
      report_matches: [],
      actionable_indices: [],
      window: resolvedWindow,
      row_limit,
    };
  }

  const discovered = await discoverHuntDatasets({
    esClient,
    patterns: searched,
    logger,
    resolved: withoutNames(resolved, dropped),
  });
  const matches = matchDatasetsDeterministic({
    datasets: discovered,
    vendor: report?.vendor,
    product: report?.product,
  });
  const reportMatches = boundReportMatches(matches, logger);
  const actionable = await classifyActionableIndices({
    esClient,
    indexPatterns: searched,
    logger,
  });

  const degraded = actionable.degraded || reportMatches.collapsed;
  logger?.info(
    `Hunt scope resolved for space ${spaceId}: ${positivePatterns.length} universe pattern(s), ${discovered.length} dataset(s), ${reportMatches.patterns.length} report match pattern(s), ${actionable.patterns.length} actionable pattern(s)`
  );
  return {
    status: degraded ? 'degraded' : 'ok',
    resolution: 'universe',
    index_patterns: searched,
    missing,
    policy_skipped: policySkippedPatterns,
    discovered,
    report_matches: reportMatches.patterns,
    actionable_indices: actionable.patterns,
    window: resolvedWindow,
    row_limit,
  };
};
