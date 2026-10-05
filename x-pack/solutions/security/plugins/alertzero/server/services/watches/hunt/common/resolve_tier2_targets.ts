/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { HuntForThreatResult } from '@kbn/alertzero-common';
import { boundTargetPatterns, collapseIndexName } from './classify_actionable_indices';
import type { DiscoveredDataset } from './discover_hunt_datasets';
import { buildMatchesRequired } from './matches_required';
import { matchDatasetsWithModel } from './match_hunt_datasets';
import type { HuntScopeReportContext } from './match_hunt_datasets';
import type { ResolvedHuntScope } from './resolve_index_scope';

/** Which signal put a pattern in `tier2_targets`. */
export type Tier2TargetSource = 'report_match' | 'tier1_hits' | 'model' | 'actionable';

export interface Tier2Targets {
  /** What Tier 2 may read, target, and count as a hit. Bounded to fit a request path. */
  tier2_targets: string[];
  /** The signals that contributed, in a fixed order. Empty when `tier2_targets` is empty. */
  tier2_target_sources: Tier2TargetSource[];
  /**
   * True when a model match joined the targets, a bound had to collapse or drop the
   * list, or a derived pattern reached outside the universe and had to be narrowed
   * or dropped.
   */
  degraded: boolean;
}

const uniq = (values: string[]): string[] => Array.from(new Set(values));

const isExclusion = (pattern: string): boolean => pattern.startsWith('-');

/** The literal text before a pattern's first `*`; the whole pattern when it has none. */
const literalPrefix = (pattern: string): string => pattern.split('*')[0];

/**
 * Maps each dataset's own `search_patterns` entries back to the dataset they came
 * from, so a pattern the universe refuses can be traded for that same dataset's
 * backing streams — already resolved against the universe, so narrower than the
 * refused pattern and incapable of straddling what it excluded.
 */
const indexDatasetsByPattern = (datasets: DiscoveredDataset[]): Map<string, DiscoveredDataset> => {
  const byPattern = new Map<string, DiscoveredDataset>();
  for (const dataset of datasets) {
    for (const pattern of dataset.search_patterns) byPattern.set(pattern, dataset);
  }
  return byPattern;
};

/**
 * Whether a derived `*`-suffixed target pattern is safe to send as-is: a universe
 * positive pattern has to cover it, and no universe exclusion may reach into it.
 *
 * This is deliberately narrower than `isIndexPatternAllowed`'s exclusion check, which
 * treats any wildcard candidate as overlapping a `*`-prefixed exclusion (an empty
 * literal prefix cannot rule anything out) — the right call for a model-authored
 * ESQL source, where a false refusal costs nothing but a retry. Here a false refusal
 * silently drops a legitimate deterministic target with no retry, so only an
 * exclusion whose own literal prefix shares a stem with the candidate's — `-logs-
 * okta.system-prod*` against `logs-okta.system-*`, not a vendor-agnostic `-*elastic-
 * cloud-logs-*` — counts as reaching into it.
 */
const staysInsideUniverse = (pattern: string, indexPatterns: string[]): boolean => {
  const positives = indexPatterns.filter((p) => !isExclusion(p));
  const exclusions = indexPatterns.filter(isExclusion).map((p) => p.slice(1));
  const probe = pattern.replace(/\*/g, 'x');
  const covered = positives.includes(pattern) || buildMatchesRequired(positives)(probe);
  if (!covered) return false;

  const patternPrefix = literalPrefix(pattern);
  return !exclusions.some((exclusion) => {
    const exclusionPrefix = literalPrefix(exclusion);
    return (
      exclusionPrefix !== '' &&
      (patternPrefix.startsWith(exclusionPrefix) || exclusionPrefix.startsWith(patternPrefix))
    );
  });
};

/**
 * Stage 2 of hunt scoping: decides what Tier 2 may read after the report was read and
 * Tier 1 ran. The targets are the union of three deterministic signals, each a
 * `*`-suffixed pattern (`buildMatchesRequired` and `isIndexPatternAllowed` only glob a
 * backing index against a wildcard-bearing pattern):
 *
 * - `report_match`: datasets the report's vendor or product matched in stage 1.
 * - `tier1_hits`: the concrete indices Tier 1 hit, collapsed to their stream or index.
 * - `actionable`: the indices where a hit can become a response action.
 *
 * The model matcher is a fallback, not a fourth signal: it runs only when the first two
 * found nothing, there is a model, and there is report text to read. A Tier 1 hit in
 * host telemetry therefore cannot hide the report's own dataset, and an article-shaped
 * report that hit nothing still gets a chance at a target.
 *
 * `report_match` and `model` are constrained against the universe (`scope.index_patterns`,
 * exclusions and namespace restrictions included) before they join the union: both carry
 * a dataset's own `search_patterns`, and discovery collapses a dataset with no sibling
 * into one `{type}-{dataset}-*` pattern wide enough to reach back over what it excluded
 * when it listed that dataset's backing streams. A refused pattern is traded for its
 * dataset's own backing streams where that stays inside the universe, dropped otherwise —
 * this runs here rather than trusting discovery already enforced it. `tier1_hits` and
 * `actionable` need no such check: both are already collapsed from concrete indices seen
 * inside the universe, never the generalized form.
 *
 * A union that does not fit a request path collapses to one pattern per dataset, then one
 * wildcard pair per vendor; if even that does not fit it is dropped rather than sent, and
 * the result reads degraded.
 */
export const resolveTier2Targets = async ({
  scope,
  tier1,
  report,
  model,
  logger,
}: {
  scope: Pick<
    ResolvedHuntScope,
    'report_matches' | 'actionable_indices' | 'discovered' | 'index_patterns'
  >;
  tier1: Pick<HuntForThreatResult, 'per_index'>;
  report?: HuntScopeReportContext;
  model?: ScopedModel;
  logger?: Logger;
}): Promise<Tier2Targets> => {
  const reportMatches = scope.report_matches;
  const tier1Hits = uniq(tier1.per_index.map(({ index }) => collapseIndexName(index)));

  let modelMatches: string[] = [];
  if (reportMatches.length === 0 && tier1Hits.length === 0 && model && report?.text) {
    const matched = await matchDatasetsWithModel({
      model,
      datasets: scope.discovered,
      report,
      logger,
    });
    modelMatches = uniq(matched?.matches.flatMap((dataset) => dataset.search_patterns) ?? []);
    if (matched) {
      logger?.debug(
        `Hunt Tier 2 targets matched by the model: ${matched.scored
          .map(({ dataset, confidence }) => `${dataset} (${confidence})`)
          .join(', ')}`
      );
    }
  }

  const datasetByPattern = indexDatasetsByPattern(scope.discovered);
  let universeNarrowed = false;
  const constrainToUniverse = (patterns: string[]): string[] =>
    uniq(
      patterns.flatMap((pattern) => {
        if (staysInsideUniverse(pattern, scope.index_patterns)) return [pattern];
        universeNarrowed = true;
        const dataset = datasetByPattern.get(pattern);
        const narrowed = (dataset?.data_streams ?? []).map((stream) => `${stream}*`);
        const allowed = narrowed.filter((candidate) =>
          staysInsideUniverse(candidate, scope.index_patterns)
        );
        logger?.warn(
          `Hunt Tier 2 target "${pattern}" reaches outside the hunt universe; ${
            allowed.length > 0 ? `narrowed to ${allowed.join(', ')}` : 'dropping it from this run'
          }`
        );
        return allowed;
      })
    );

  // Only `report_match` and `model` carry a dataset's raw `search_patterns`, so only
  // they can carry the generalized, unconstrained pattern discovery produces for a
  // dataset with no sibling. `tier1_hits` and `actionable` are already collapsed from
  // concrete indices Tier 1 or `classifyActionableIndices` actually saw inside the
  // universe — stream-level by construction, nothing left to narrow.
  const bySource: Array<[Tier2TargetSource, string[]]> = [
    ['report_match', constrainToUniverse(reportMatches)],
    ['tier1_hits', tier1Hits],
    ['model', constrainToUniverse(modelMatches)],
    ['actionable', scope.actionable_indices],
  ];
  const contributing = bySource.filter(([, patterns]) => patterns.length > 0);
  const union = uniq(contributing.flatMap(([, patterns]) => patterns));
  if (union.length === 0) {
    return { tier2_targets: [], tier2_target_sources: [], degraded: universeNarrowed };
  }

  const bounded = boundTargetPatterns(union);
  if (!bounded.fits) {
    logger?.warn(
      `Hunt Tier 2 targets named ${union.length} index pattern(s), more than a request may carry even as vendor wildcards; Tier 2 gets no targets this run`
    );
    return { tier2_targets: [], tier2_target_sources: [], degraded: true };
  }
  if (bounded.collapsed) {
    logger?.warn(
      `Hunt Tier 2 targets named ${union.length} index pattern(s), more than a request may carry; collapsed to ${bounded.patterns.length}`
    );
  }

  return {
    tier2_targets: bounded.patterns,
    tier2_target_sources: contributing.map(([source]) => source),
    degraded: modelMatches.length > 0 || bounded.collapsed || universeNarrowed,
  };
};
