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
  /** True when a model match joined the targets, or a bound had to collapse or drop the list. */
  degraded: boolean;
}

const uniq = (values: string[]): string[] => Array.from(new Set(values));

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
  scope: Pick<ResolvedHuntScope, 'report_matches' | 'actionable_indices' | 'discovered'>;
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

  const bySource: Array<[Tier2TargetSource, string[]]> = [
    ['report_match', reportMatches],
    ['tier1_hits', tier1Hits],
    ['model', modelMatches],
    ['actionable', scope.actionable_indices],
  ];
  const contributing = bySource.filter(([, patterns]) => patterns.length > 0);
  const union = uniq(contributing.flatMap(([, patterns]) => patterns));
  if (union.length === 0) {
    return { tier2_targets: [], tier2_target_sources: [], degraded: false };
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
    degraded: modelMatches.length > 0 || bounded.collapsed,
  };
};
