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
  ReverseMapErrors,
} from './reverse_map_types';

export type Dimension = 'coverage' | 'quality' | 'continuity' | 'retention';

/**
 * Pre-built reverse maps used to determine blast radius for a finding.
 *
 * - indexToRules: concrete index/data stream name → rules that query it
 * - pipelineToIndices: ingest pipeline name → indices using that pipeline
 * - categoryToIndices: SIEM category (e.g. "Cloud") → indices in that category
 * - tacticTotals: tactic ID → total number of rules covering that tactic (for % impact)
 * - indexToPlatform: data stream name → platform label derived from ECS fields in the data
 * - errors: tracks which lookups failed so blast radius can be marked unavailable/partial
 *   instead of showing a confident "none" false signal.
 *
 * All maps are built once per request by fetchRulesReverseMap / fetchIndexPlatforms and
 * passed into enrichFinding/enrichFindings.
 */
export interface EnrichmentContext {
  indexToRules: IndexToRulesMap;
  pipelineToIndices: PipelineToIndicesMap;
  categoryToIndices: CategoryToIndicesMap;
  tacticTotals: TacticTotals;
  dimension: Dimension;
  /** Data stream name → platform label, derived from actual ECS field values in the index */
  indexToPlatform: Map<string, string>;
  /**
   * Tracks which reverse-map lookups failed. Used to set blastRadiusStatus on enriched findings
   * so the agent can distinguish "no rules found" from "lookup failed".
   *
   * Defaults to all-false when omitted (e.g. in tests that don't exercise error paths).
   */
  errors?: ReverseMapErrors;
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
 * Extracts the parent data stream name from a backing index name.
 * Backing indices follow the pattern: .ds-{data_stream_name}-YYYY.MM.DD-NNNNNN
 *
 * @example
 * ".ds-logs-aws.cloudtrail-default-2026.01.01-000001" → "logs-aws.cloudtrail-default"
 */
const extractDataStreamName = (resource: string): string | undefined => {
  const match = resource.match(/^\.ds-(.+)-\d{4}\.\d{2}\.\d{2}-\d+$/);
  return match?.[1];
};

const createResourceSlug = (resource: string): string => {
  return resource
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase()
    .slice(0, 50);
};

/**
 * Builds the list of recommended actions for a finding.
 * "View affected rules" with an ?index= filter is only meaningful for index-keyed dimensions
 * (quality and retention), where finding.resource IS an index name.
 * For continuity, resource is a pipeline name; for coverage, it is a category name or
 * "detection_rules" — none of which are valid index filter values on the rules page.
 */
const buildRecommendedActionsForFinding = (
  finding: ActionableFinding,
  dimension: Dimension
): RecommendedAction[] => {
  const slug = createResourceSlug(finding.resource);
  const actions: RecommendedAction[] = [];

  if (dimension === 'quality' || dimension === 'retention') {
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
 * Derives the blast radius status for a finding based on which reverse-map lookups failed.
 *
 * - 'unavailable': the primary lookup for this dimension failed entirely (pipeline map for
 *   continuity, category map for coverage). The affected* fields must be omitted because the
 *   empty map is not trustworthy — returning "none" would be a false signal.
 * - 'partial': at least one rule's index resolution failed, so indexToRules is incomplete.
 *   The affected* fields are still populated from what did resolve, but may be undercounted.
 * - undefined: blast radius is complete and trustworthy.
 */
const deriveBlastRadiusStatus = (
  dimension: Dimension,
  errors: ReverseMapErrors
): 'unavailable' | 'partial' | undefined => {
  if (dimension === 'continuity' && errors.pipelineMap) return 'unavailable';
  if (dimension === 'coverage' && errors.categoryMap) return 'unavailable';
  if (errors.rulesPartial) return 'partial';
  return undefined;
};

/**
 * Enriches a single finding with blast radius data:
 * affected rules, MITRE tactics, platform, and recommended actions.
 *
 * When a reverse-map lookup failed, blastRadiusStatus is set to 'unavailable' or 'partial'
 * and affected* fields are omitted (unavailable) or flagged as potentially incomplete (partial),
 * to avoid presenting a confident "none" when the truth is "we couldn't determine this."
 *
 * Fields are omitted (set to undefined) when empty to keep the AI tool payload concise.
 */
export const enrichFinding = (
  finding: ActionableFinding,
  ctx: EnrichmentContext
): ActionableFinding => {
  const errors = ctx.errors ?? { pipelineMap: false, categoryMap: false, rulesPartial: false };
  const blastRadiusStatus = deriveBlastRadiusStatus(ctx.dimension, errors);

  // 5. Build dimension-specific recommended actions (always included, independent of blast radius)
  const recommendedActions = buildRecommendedActionsForFinding(finding, ctx.dimension);
  const severity = finding.severity.toUpperCase() as FindingSeverity;

  // When the primary lookup for this dimension failed entirely, omit affected* fields entirely
  // rather than showing empty arrays that look like "no impact found".
  if (blastRadiusStatus === 'unavailable') {
    return {
      ...finding,
      severity,
      affectedRules: undefined,
      affectedTactics: undefined,
      affectedPlatform: undefined,
      recommendedActions,
      blastRadiusStatus,
    };
  }

  // 1. Resolve which detection rules are affected by this finding
  const rules = getRulesForFinding(finding, ctx);

  // 2. Collect rule id + name (strip internal fields like tactics)
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

  // 4. Derive platform from the actual index data (ECS fields).
  //    For quality/retention, finding.resource IS the index name → direct lookup.
  //    For continuity, finding.resource is a pipeline name → resolve via pipelineToIndices first.
  //    For coverage, finding.resource is a category name → resolve via categoryToIndices first.
  //    Then a two-step lookup handles both data stream names and backing index names.
  let platformLookupIndex = finding.resource;
  if (ctx.dimension === 'continuity') {
    platformLookupIndex = ctx.pipelineToIndices.get(finding.resource)?.[0] ?? finding.resource;
  } else if (ctx.dimension === 'coverage') {
    platformLookupIndex = ctx.categoryToIndices.get(finding.resource)?.[0] ?? finding.resource;
  }

  const affectedPlatform =
    ctx.indexToPlatform.get(platformLookupIndex) ??
    ctx.indexToPlatform.get(extractDataStreamName(platformLookupIndex) ?? '');

  // 6. Return enriched finding; omit empty arrays to keep payload clean
  return {
    ...finding,
    severity,
    affectedRules: affectedRules.length > 0 ? affectedRules : undefined,
    affectedTactics: affectedTactics.length > 0 ? affectedTactics : undefined,
    affectedPlatform,
    recommendedActions,
    blastRadiusStatus,
  };
};

export const enrichFindings = (
  findings: ActionableFinding[],
  ctx: EnrichmentContext
): ActionableFinding[] => {
  return findings.map((finding) => enrichFinding(finding, ctx));
};
