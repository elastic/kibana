/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dimension } from './enrich_finding';
import type {
  ActionableFinding,
  CategoriesResponse,
  FindingSeverity,
  MainCategories,
  PlatformReadinessItem,
  PlatformReadinessPayload,
  VisibilityStatus,
} from './types';
import type {
  CategoryToIndicesMap,
  IndexToRulesMap,
  PipelineToIndicesMap,
  RuleIndexEntry,
} from './reverse_map_types';

export interface PlatformFindingInput {
  dimension: Dimension;
  finding: ActionableFinding;
}

export interface BuildPlatformReadinessParams {
  indexToPlatform: Map<string, string>;
  indexToRules: IndexToRulesMap;
  pipelineToIndices: PipelineToIndicesMap;
  categoryToIndices: CategoryToIndicesMap;
  categoriesResult: CategoriesResponse;
  findings: PlatformFindingInput[];
  platformFilter?: string;
}

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  CRITICAL: 3,
  WARNING: 2,
  INFORMATIONAL: 1,
};

const extractDataStreamName = (resource: string): string | undefined => {
  const match = resource.match(/^\.ds-(.+)-\d{4}\.\d{2}\.\d{2}-\d+$/);
  return match?.[1];
};

const toDataStreamName = (index: string): string => extractDataStreamName(index) ?? index;

const dedupeRulesById = (rules: RuleIndexEntry[]): RuleIndexEntry[] => {
  const seen = new Set<string>();
  return rules.filter((rule) => {
    if (seen.has(rule.id)) {
      return false;
    }
    seen.add(rule.id);
    return true;
  });
};

const getRulesForIndices = (
  indices: Iterable<string>,
  indexToRules: IndexToRulesMap
): RuleIndexEntry[] => {
  const rules = [...indices].flatMap((index) => indexToRules.get(index) ?? []);
  return dedupeRulesById(rules);
};

const resolvePlatformForFinding = (
  input: PlatformFindingInput,
  indexToPlatform: Map<string, string>,
  pipelineToIndices: PipelineToIndicesMap,
  categoryToIndices: CategoryToIndicesMap
): string | undefined => {
  const { dimension, finding } = input;

  if (finding.affectedPlatform) {
    return finding.affectedPlatform;
  }

  let platformLookupIndex = finding.resource;
  if (dimension === 'continuity') {
    platformLookupIndex = pipelineToIndices.get(finding.resource)?.[0] ?? finding.resource;
  } else if (dimension === 'coverage') {
    platformLookupIndex = categoryToIndices.get(finding.resource)?.[0] ?? finding.resource;
  }

  return (
    indexToPlatform.get(platformLookupIndex) ??
    indexToPlatform.get(extractDataStreamName(platformLookupIndex) ?? '')
  );
};

const invertPlatformMap = (indexToPlatform: Map<string, string>): Map<string, Set<string>> => {
  const platformToStreams = new Map<string, Set<string>>();

  for (const [indexName, platform] of indexToPlatform.entries()) {
    const streamName = toDataStreamName(indexName);
    const streams = platformToStreams.get(platform) ?? new Set<string>();
    streams.add(streamName);
    platformToStreams.set(platform, streams);
  }

  return platformToStreams;
};

const getPrimaryCategory = (
  streamNames: Set<string>,
  categoriesResult: CategoriesResponse
): MainCategories | undefined => {
  const categoryDocCounts = new Map<string, number>();

  for (const group of categoriesResult.mainCategoriesMap ?? []) {
    for (const indexInfo of group.indices) {
      const streamName = toDataStreamName(indexInfo.indexName);
      if (streamNames.has(streamName) || streamNames.has(indexInfo.indexName)) {
        const current = categoryDocCounts.get(group.category) ?? 0;
        categoryDocCounts.set(group.category, current + indexInfo.docs);
      }
    }
  }

  let primaryCategory: MainCategories | undefined;
  let maxDocs = -1;
  for (const [category, docs] of categoryDocCounts.entries()) {
    if (docs > maxDocs) {
      maxDocs = docs;
      primaryCategory = category as MainCategories;
    }
  }

  return primaryCategory;
};

const getPlatformStatus = (
  activeStreams: number,
  enabledRules: number,
  findings: ActionableFinding[]
): VisibilityStatus => {
  const hasActionableFinding = findings.some(
    (finding) => finding.severity === 'CRITICAL' || finding.severity === 'WARNING'
  );
  if (hasActionableFinding) {
    return 'actionsRequired';
  }
  if (activeStreams === 0 && enabledRules === 0) {
    return 'noData';
  }
  return 'healthy';
};

const getTopFinding = (findings: ActionableFinding[]): string | undefined => {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
  );
  return sorted[0]?.message;
};

const worstStatus = (statuses: VisibilityStatus[]): VisibilityStatus => {
  if (statuses.some((status) => status === 'actionsRequired')) {
    return 'actionsRequired';
  }
  if (statuses.some((status) => status === 'noData')) {
    return 'noData';
  }
  return 'healthy';
};

export const matchPlatforms = (
  query: string,
  platforms: string[]
): { matches: string[]; ambiguous: boolean } => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return { matches: platforms, ambiguous: false };
  }

  const exactMatches = platforms.filter((platform) => platform.toLowerCase() === normalizedQuery);
  if (exactMatches.length > 0) {
    return { matches: exactMatches, ambiguous: exactMatches.length > 1 };
  }

  const partialMatches = platforms.filter((platform) =>
    platform.toLowerCase().includes(normalizedQuery)
  );
  return { matches: partialMatches, ambiguous: partialMatches.length > 1 };
};

const buildPlatformSummary = (
  platforms: PlatformReadinessItem[],
  platformFilter: string | undefined,
  matchResult: { matches: string[]; ambiguous: boolean },
  allPlatformNames: string[]
): string => {
  if (platformFilter && matchResult.matches.length === 0) {
    const knownPlatforms = allPlatformNames.join(', ');
    return knownPlatforms
      ? `No platform matched "${platformFilter}". Known platforms: ${knownPlatforms}.`
      : `No platform matched "${platformFilter}" and no platforms were discovered.`;
  }

  if (platformFilter && matchResult.ambiguous) {
    return `Multiple platforms matched "${platformFilter}": ${matchResult.matches.join(', ')}.`;
  }

  if (platformFilter && platforms.length === 1) {
    const platform = platforms[0];
    const issue = platform.topFinding ? ` ${platform.topFinding}` : '';
    return `${platform.platform}: ${platform.activeStreams} active stream(s), ${platform.enabledRules} enabled rule(s), ${platform.mitreTactics} MITRE tactic(s).${issue}`;
  }

  const needingAction = platforms.filter((platform) => platform.status === 'actionsRequired');
  if (needingAction.length === 0) {
    return `All ${platforms.length} discovered platform(s) are healthy.`;
  }

  const leastReady = needingAction
    .map((platform) => platform.platform)
    .slice(0, 3)
    .join(', ');
  return `Coverage is uneven across platforms. Platforms needing attention: ${leastReady}.`;
};

export const buildPlatformReadiness = ({
  indexToPlatform,
  indexToRules,
  pipelineToIndices,
  categoryToIndices,
  categoriesResult,
  findings,
  platformFilter,
}: BuildPlatformReadinessParams): PlatformReadinessPayload => {
  const platformToStreams = invertPlatformMap(indexToPlatform);
  const findingsByPlatform = new Map<string, ActionableFinding[]>();

  for (const input of findings) {
    const platform = resolvePlatformForFinding(
      input,
      indexToPlatform,
      pipelineToIndices,
      categoryToIndices
    );
    if (platform) {
      const existing = findingsByPlatform.get(platform) ?? [];
      existing.push(input.finding);
      findingsByPlatform.set(platform, existing);
    }
  }

  const allPlatformNames = new Set<string>([
    ...platformToStreams.keys(),
    ...findingsByPlatform.keys(),
  ]);

  let platforms: PlatformReadinessItem[] = [...allPlatformNames].map((platform) => {
    const streamNames = platformToStreams.get(platform) ?? new Set<string>();
    const platformIndices = new Set<string>();
    for (const [indexName, label] of indexToPlatform.entries()) {
      if (label === platform) {
        platformIndices.add(indexName);
        platformIndices.add(toDataStreamName(indexName));
      }
    }

    const platformFindings = findingsByPlatform.get(platform) ?? [];
    const rules = getRulesForIndices(platformIndices, indexToRules);
    const tacticIds = new Set<string>();
    for (const rule of rules) {
      for (const tactic of rule.tactics) {
        tacticIds.add(tactic.id);
      }
    }

    const item: PlatformReadinessItem = {
      platform,
      primaryCategory: getPrimaryCategory(streamNames, categoriesResult),
      activeStreams: streamNames.size,
      enabledRules: rules.length,
      mitreTactics: tacticIds.size,
      status: getPlatformStatus(streamNames.size, rules.length, platformFindings),
      topFinding: getTopFinding(platformFindings),
      findings: platformFindings,
    };
    return item;
  });

  platforms.sort((a, b) => {
    if (a.status === 'actionsRequired' && b.status !== 'actionsRequired') {
      return -1;
    }
    if (b.status === 'actionsRequired' && a.status !== 'actionsRequired') {
      return 1;
    }
    return a.platform.localeCompare(b.platform);
  });

  const allNames = platforms.map((platform) => platform.platform);
  const matchResult = platformFilter
    ? matchPlatforms(platformFilter, allNames)
    : { matches: allNames, ambiguous: false };

  if (platformFilter) {
    platforms = platforms.filter((platform) => matchResult.matches.includes(platform.platform));
  }

  const status =
    platforms.length > 0 ? worstStatus(platforms.map((platform) => platform.status)) : 'noData';
  const summary = buildPlatformSummary(platforms, platformFilter, matchResult, allNames);

  return {
    status,
    summary,
    platforms,
  };
};
