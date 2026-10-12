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
import { matchDatasetsWithModel } from './match_hunt_datasets';
import type { HuntScopeReportContext } from './match_hunt_datasets';
import type { ResolvedHuntScope } from './resolve_index_scope';
import { fitsRequestPath } from './scope_bounds';

/** Which signal put a pattern in `tier2_targets`. */
export type Tier2TargetSource = 'report_match' | 'tier1_hits' | 'model' | 'actionable';

export interface Tier2Targets {
  /** What Tier 2 may read, target, and count as a hit. Bounded to fit a request path. */
  tier2_targets: string[];
  /** The signals that contributed, in a fixed order. Empty when `tier2_targets` is empty. */
  tier2_target_sources: Tier2TargetSource[];
  /**
   * What the report itself points at: the `report_match` and `model` datasets, without the
   * indices Tier 1 happened to hit or the process-bearing streams added for response actions.
   * Bounded and universe-checked like `tier2_targets`. A coverage KI names these as the data a
   * detection would query; empty when neither signal matched or the list did not fit.
   */
  report_intent_targets: string[];
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
 * True for a pattern this module can reason about by literal prefix alone: exact,
 * or carrying exactly one `*` at the very end. A universe positive shaped any other
 * way (`logs-*-default*`) still constrains what comes after its first `*`, which a
 * prefix comparison cannot see — a trailing-wildcard candidate whose prefix merely
 * extends that positive's isn't actually guaranteed to satisfy the rest of it, so
 * such a positive is not trusted to grant coverage at all rather than risk it.
 */
const isTrailingWildcardOrExact = (pattern: string): boolean => {
  const starIndex = pattern.indexOf('*');
  return starIndex === -1 || starIndex === pattern.length - 1;
};

/**
 * Maps each dataset's own `search_patterns` entries, and its generalized
 * `index_pattern`, back to the dataset they came from, so a pattern the universe
 * refuses — whether discovery's own output or `boundTargetPatterns`'s later
 * dataset-collapse, which reconstructs that same `index_pattern` shape — can be
 * traded for that dataset's backing streams, already resolved against the universe
 * and so incapable of straddling what it excluded.
 */
const indexDatasetsByPattern = (datasets: DiscoveredDataset[]): Map<string, DiscoveredDataset> => {
  const byPattern = new Map<string, DiscoveredDataset>();
  for (const dataset of datasets) {
    byPattern.set(dataset.index_pattern, dataset);
    for (const pattern of dataset.search_patterns) byPattern.set(pattern, dataset);
  }
  return byPattern;
};

/**
 * Whether a derived `*`-suffixed target pattern is safe to send as-is: a universe
 * positive pattern has to cover it, and no universe exclusion may reach into it.
 *
 * Every candidate this module checks is exact or carries a single trailing `*`
 * (`classify_actionable_indices.ts`'s `collapseIndexName` and this module's own
 * callers only ever produce that shape), so containment against a positive shaped
 * the same way reduces to literal-prefix comparison: a wildcard positive covers a
 * candidate whose prefix extends its own; an exact positive covers only a
 * candidate naming that same stream. A universe positive is not guaranteed to be
 * shaped that way, though (`logs-*-default*` is a legal `defaultIndex` entry), so
 * `isTrailingWildcardOrExact` gates which positives this fast comparison may use;
 * one shaped any other way grants no coverage rather than being reasoned about
 * incorrectly. Testing a single synthetic probe string (substituting `*` for a
 * literal character) was tried first and dropped — it returns the wrong answer
 * whenever a positive's own prefix happens to extend the candidate's by exactly
 * that character, and an exact positive can never match a probe that appends
 * anything, including the trailing `*` every candidate here carries.
 *
 * The exclusion side stays conservative only up to a point: an exclusion whose own
 * literal prefix shares a stem with the candidate's — `-logs-okta.system-prod*`
 * against `logs-okta.system-*` — counts as reaching into it. One with no literal
 * prefix at all (`-*elastic-cloud-logs-*`) is not checked here; treating it as
 * reaching everywhere would narrow or drop every generalized pattern regardless of
 * dataset, which is tracked separately as a follow-up rather than folded in here.
 */
const staysInsideUniverse = (pattern: string, indexPatterns: string[]): boolean => {
  const positives = indexPatterns.filter((p) => !isExclusion(p));
  const exclusions = indexPatterns.filter(isExclusion).map((p) => p.slice(1));
  const patternPrefix = literalPrefix(pattern);

  const covered = positives.some(
    (positive) =>
      isTrailingWildcardOrExact(positive) &&
      (positive.includes('*')
        ? patternPrefix.startsWith(literalPrefix(positive))
        : patternPrefix === positive)
  );
  if (!covered) return false;

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
  const constrainedReportMatches = constrainToUniverse(reportMatches);
  const constrainedModelMatches = constrainToUniverse(modelMatches);
  const bySource: Array<[Tier2TargetSource, string[]]> = [
    ['report_match', constrainedReportMatches],
    ['tier1_hits', tier1Hits],
    ['model', constrainedModelMatches],
    ['actionable', scope.actionable_indices],
  ];

  const intent = uniq([...constrainedReportMatches, ...constrainedModelMatches]);
  const boundedIntent = boundTargetPatterns(intent);
  const intentExpanded = !boundedIntent.fits
    ? []
    : boundedIntent.collapsed
    ? constrainToUniverse(boundedIntent.patterns)
    : boundedIntent.patterns;
  // Universe narrowing can trade a collapsed dataset pattern back for its streams, so the bound
  // is checked again, as it is for `tier2_targets`. The route and the packaging step both cap
  // this list, so one that no longer fits would make the whole coordinator result invalid.
  const reportIntentTargets = fitsRequestPath(intentExpanded) ? intentExpanded : [];
  if (intentExpanded.length > 0 && reportIntentTargets.length === 0) {
    logger?.warn(
      `Hunt report-intent targets grew to ${intentExpanded.length} stream pattern(s) after the universe check, more than a request may carry; none are reported this run`
    );
  }
  const contributing = bySource.filter(([, patterns]) => patterns.length > 0);
  const union = uniq(contributing.flatMap(([, patterns]) => patterns));
  if (union.length === 0) {
    return {
      tier2_targets: [],
      tier2_target_sources: [],
      report_intent_targets: reportIntentTargets,
      degraded: universeNarrowed,
    };
  }

  const bounded = boundTargetPatterns(union);
  if (!bounded.fits) {
    logger?.warn(
      `Hunt Tier 2 targets named ${union.length} index pattern(s), more than a request may carry even as vendor wildcards; Tier 2 gets no targets this run`
    );
    return {
      tier2_targets: [],
      tier2_target_sources: [],
      report_intent_targets: reportIntentTargets,
      degraded: true,
    };
  }
  if (bounded.collapsed) {
    logger?.warn(
      `Hunt Tier 2 targets named ${union.length} index pattern(s), more than a request may carry; collapsed to ${bounded.patterns.length}`
    );
  }

  // `collapsed` means bounding reconstructed new pattern strings — one per dataset,
  // which is the exact `{type}-{dataset}-*` shape discovery itself generalizes to —
  // rather than passing the union through untouched. That reconstruction can
  // re-widen a pattern already narrowed above, or a `tier1_hits`/`actionable` pattern
  // that was stream-level going in, so re-run the check on it rather than trust
  // bounding preserved what came in. An uncollapsed union is exactly what was
  // already checked (or, for `tier1_hits`/`actionable`, never needed checking), so
  // there is nothing new to re-verify.
  const finalTargets = bounded.collapsed ? constrainToUniverse(bounded.patterns) : bounded.patterns;

  // Trading a collapsed dataset-wide pattern back for its backing streams can grow
  // the list again — a dataset bounding kept as one pattern specifically because its
  // own namespace count is large is the one case this expansion re-inflates. A list
  // that no longer fits is dropped rather than sent partially bounded, the same call
  // `!bounded.fits` above already makes.
  if (bounded.collapsed && !fitsRequestPath(finalTargets)) {
    logger?.warn(
      `Hunt Tier 2 targets narrowed back to ${finalTargets.length} backing stream pattern(s) after the universe check, more than a request may carry; Tier 2 gets no targets this run`
    );
    return {
      tier2_targets: [],
      tier2_target_sources: [],
      report_intent_targets: reportIntentTargets,
      degraded: true,
    };
  }

  return {
    tier2_targets: finalTargets,
    tier2_target_sources: contributing.map(([source]) => source),
    report_intent_targets: reportIntentTargets,
    degraded: modelMatches.length > 0 || bounded.collapsed || universeNarrowed,
  };
};
