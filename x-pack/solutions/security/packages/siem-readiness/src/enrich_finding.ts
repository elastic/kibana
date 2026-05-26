/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionableFinding,
  AffectedRule,
  AffectedTactic,
  FindingSeverity,
  RecommendedAction,
} from './types';

import type {
  IndexToRulesMap,
  PipelineToIndicesMap,
  CategoryToIndicesMap,
  TacticTotals,
  RuleIndexEntry,
} from './reverse_map_types';

export type Dimension = 'coverage' | 'quality' | 'continuity' | 'retention';

/**
 * Pre-built reverse maps used to determine blast radius for a finding.
 *
 * - indexToRules: concrete index/data stream name → rules that query it
 * - pipelineToIndices: ingest pipeline name → indices using that pipeline
 * - categoryToIndices: SIEM category (e.g. "Cloud") → indices in that category
 * - tacticTotals: tactic ID → total number of rules covering that tactic (for % impact)
 *
 * All maps are built once per request by fetchRulesReverseMap and passed into
 * enrichFinding/enrichFindings.
 */
export interface EnrichmentContext {
  indexToRules: IndexToRulesMap;
  pipelineToIndices: PipelineToIndicesMap;
  categoryToIndices: CategoryToIndicesMap;
  tacticTotals: TacticTotals;
  dimension: Dimension;
}

// A rule can appear in multiple indices (e.g. via wildcard patterns), so when
// walking pipeline→indices→rules or category→indices→rules we dedupe by id.
const dedupeRulesById = (rules: RuleIndexEntry[]): RuleIndexEntry[] => {
  const seen = new Set<string>();
  return rules.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
};

/**
 * Returns the detection rules affected by a finding, using dimension-specific
 * lookup paths through the reverse maps:
 *
 * - quality / retention: finding.resource IS the index name → direct lookup
 * - continuity: finding.resource is a pipeline → pipeline→indices→rules
 * - coverage: finding.resource is a SIEM category → category→indices→rules
 *   (detection_rules findings have no index to look up, so we return nothing)
 */
const getRulesForFinding = (
  finding: ActionableFinding,
  ctx: EnrichmentContext
): RuleIndexEntry[] => {
  switch (ctx.dimension) {
    case 'quality':
    case 'retention':
      return ctx.indexToRules.get(finding.resource) ?? [];

    case 'continuity': {
      const indicesUsingPipeline = ctx.pipelineToIndices.get(finding.resource) ?? [];
      const rulesFromPipeline = indicesUsingPipeline.flatMap(
        (idx) => ctx.indexToRules.get(idx) ?? []
      );
      return dedupeRulesById(rulesFromPipeline);
    }

    case 'coverage': {
      if (finding.resource === 'detection_rules') {
        return [];
      }
      const indicesInCategory = ctx.categoryToIndices.get(finding.resource) ?? [];
      const rulesFromCategory = indicesInCategory.flatMap((idx) => ctx.indexToRules.get(idx) ?? []);
      return dedupeRulesById(rulesFromCategory);
    }

    default:
      return [];
  }
};

/**
 * Derives the affected platform from the set of impacted rules using a
 * majority-vote approach:
 * - If one platform accounts for >50% of rules → return it alone (clear owner)
 * - Otherwise → return up to the top 3 platforms joined by comma (mixed finding)
 */
const derivePlatformFromRules = (rules: RuleIndexEntry[]): string | undefined => {
  const platforms = rules.map((r) => r.platform).filter((p): p is string => p !== undefined);

  if (platforms.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const p of platforms) {
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted[0][1] > rules.length / 2) {
    return sorted[0][0];
  }

  return sorted
    .slice(0, 3)
    .map(([p]) => p)
    .join(', ');
};

const createResourceSlug = (resource: string): string => {
  return resource
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase()
    .slice(0, 50);
};

/**
 * Builds the list of recommended actions for a finding.
 * "View affected rules" is omitted for coverage/detection_rules findings because
 * that finding has no concrete index to pass as a filter to the rules page.
 */
const buildRecommendedActionsForFinding = (
  finding: ActionableFinding,
  dimension: Dimension
): RecommendedAction[] => {
  const slug = createResourceSlug(finding.resource);
  const actions: RecommendedAction[] = [];

  if (dimension !== 'coverage' || finding.resource !== 'detection_rules') {
    actions.push({
      label: 'View affected rules',
      href: `/app/security/rules?index=${encodeURIComponent(finding.resource)}`,
    });
  }

  switch (dimension) {
    case 'continuity':
      actions.push({
        label: 'Open ingest pipelines',
        href: '/app/management/ingest/ingest_pipelines',
      });
      break;
    case 'retention':
      actions.push({
        label: 'Open ILM policies',
        href: '/app/management/data/index_lifecycle_management',
      });
      break;
    case 'quality':
      actions.push({
        label: 'Open Data Quality',
        href: '/app/security/data_quality',
      });
      break;
    case 'coverage':
      actions.push({
        label: 'View rule coverage',
        href: '/app/security/rules/coverage',
      });
      break;
  }

  actions.push({
    label: 'Open case',
    href: `/app/security/cases/create?tags=readiness:${dimension},${finding.severity.toLowerCase()},${slug}`,
  });

  return actions;
};

/**
 * Enriches a single finding with blast radius data:
 * affected rules, MITRE tactics, platform, and recommended actions.
 *
 * Fields are omitted (set to undefined) when empty to keep the AI tool payload
 * concise and avoid misleading "0 rules affected" signals.
 */
export const enrichFinding = (
  finding: ActionableFinding,
  ctx: EnrichmentContext
): ActionableFinding => {
  // 1. Resolve which detection rules are affected by this finding
  const rules = getRulesForFinding(finding, ctx);

  // 2. Collect rule id + name (strip internal fields like platform/tactics)
  const affectedRules: AffectedRule[] = rules.map((r) => ({ id: r.id, name: r.name }));

  // 3. Count how many affected rules cover each MITRE tactic
  const tacticCounts = new Map<string, number>();
  for (const rule of rules) {
    for (const tactic of rule.tactics) {
      tacticCounts.set(tactic.id, (tacticCounts.get(tactic.id) ?? 0) + 1);
    }
  }

  const affectedTactics: AffectedTactic[] = [...tacticCounts.entries()].map(([id, count]) => {
    const total = ctx.tacticTotals.get(id);
    return {
      id,
      name: total?.name ?? id,
      totalRules: total?.totalRules ?? 0,
      affectedRulesCount: count,
    };
  });

  // 4. Derive the dominant platform via majority vote across affected rules
  const affectedPlatform = derivePlatformFromRules(rules);

  // 5. Build dimension-specific recommended actions
  const recommendedActions = buildRecommendedActionsForFinding(finding, ctx.dimension);

  const severity = finding.severity.toUpperCase() as FindingSeverity;

  // 6. Return enriched finding; omit empty arrays to keep payload clean
  return {
    ...finding,
    severity,
    affectedRules: affectedRules.length > 0 ? affectedRules : undefined,
    affectedTactics: affectedTactics.length > 0 ? affectedTactics : undefined,
    affectedPlatform,
    recommendedActions,
  };
};

export const enrichFindings = (
  findings: ActionableFinding[],
  ctx: EnrichmentContext
): ActionableFinding[] => {
  return findings.map((finding) => enrichFinding(finding, ctx));
};
