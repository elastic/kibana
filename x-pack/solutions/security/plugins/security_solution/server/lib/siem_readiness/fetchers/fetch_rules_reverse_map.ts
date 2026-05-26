/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type {
  RuleIndexEntry,
  IndexToRulesMap,
  PipelineToIndicesMap,
  CategoryToIndicesMap,
  TacticTotals,
  MachineLearningRuleIndex,
  ReverseMapResult,
  CategoriesResponse,
} from '@kbn/siem-readiness';

import { findRules } from '../../detection_engine/rule_management/logic/search/find_rules';
import type { RuleParams } from '../../detection_engine/rule_schema';
import { fetchCategories } from './fetch_categories';

export interface FetchRulesReverseMapDeps {
  rulesClient: RulesClient;
  esClient: ElasticsearchClient;
  dataViewsService: DataViewsService;
  logger: Logger;
  /** Map of Fleet package names to display titles, populated via buildPackageToPlatform(fleetPackages) */
  packageToPlatform?: Map<string, string>;
  /**
   * Pre-fetched categories result. When provided, the internal fetchCategories call is skipped,
   * eliminating the duplicate ES aggregation that occurs when callers already hold this data.
   */
  categoriesData?: CategoriesResponse;
}

/**
 * Creates a lookup map from Fleet package names to their display titles.
 * Used for deriving the affected platform from a rule's related_integrations.
 *
 * @param packages - Fleet packages from packageService.asInternalUser.getPackages()
 * @returns Map where key is package name (e.g., "aws") and value is title (e.g., "AWS")
 *
 * @example
 * // Input: [{ name: "aws", title: "AWS" }, { name: "endpoint", title: "Endpoint Security" }]
 * // Output: Map { "aws" => "AWS", "endpoint" => "Endpoint Security" }
 */
export const buildPackageToPlatform = (
  packages: Array<{ name: string; title: string }>
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const pkg of packages) {
    map.set(pkg.name, pkg.title);
  }
  return map;
};

interface ThreatTactic {
  id?: string;
  name?: string;
  reference?: string;
}

const extractTactics = (params: RuleParams): Array<{ id: string; name: string }> => {
  const threat = params.threat;
  if (!threat || !Array.isArray(threat)) {
    return [];
  }

  const tactics: Array<{ id: string; name: string }> = [];
  for (const item of threat) {
    const tactic = item.tactic as ThreatTactic | undefined;
    if (tactic?.id && tactic?.name) {
      tactics.push({ id: tactic.id, name: tactic.name });
    }
  }
  return tactics;
};

interface RelatedIntegration {
  package?: string;
  version?: string;
  integration?: string;
}

interface AlertingRule {
  id: string;
  name: string;
  tags: string[];
  enabled: boolean;
  params: RuleParams;
}

/**
 * Builds a rule entry with platform derivation for blast radius enrichment.
 *
 * Platform derivation strategy (in order of precedence):
 * 1. Fleet package lookup: Uses relatedIntegrations[0].package to look up the
 *    display title from packageToPlatform map (e.g., "aws" → "AWS")
 * 2. Domain tag fallback: Extracts platform from "Domain: <platform>" tag
 *    (e.g., "Domain: Cloud" → "Cloud")
 * 3. OS tag fallback: Extracts platform from "OS: <platform>" tag
 *    (e.g., "OS: Windows" → "Windows")
 * 4. Default: undefined if none of the above match
 */
const buildRuleEntry = (
  rule: AlertingRule,
  packageToPlatform: Map<string, string>
): RuleIndexEntry => {
  // 1. Try Fleet package lookup via related_integrations
  const relatedIntegrations = (rule.params as { relatedIntegrations?: RelatedIntegration[] })
    .relatedIntegrations;
  const pkg = relatedIntegrations?.[0]?.package;
  let platform = pkg ? packageToPlatform.get(pkg) : undefined;

  // 2. Fallback to rule tags if Fleet lookup didn't yield a platform
  if (!platform) {
    const { tags } = rule;
    if (tags) {
      const domainTag = tags.find((t) => t.startsWith('Domain: '));
      if (domainTag) {
        platform = domainTag.replace('Domain: ', '');
      } else {
        const osTag = tags.find((t) => t.startsWith('OS: '));
        if (osTag) {
          platform = osTag.replace('OS: ', '');
        }
      }
    }
  }

  return {
    id: rule.id,
    name: rule.name,
    tactics: extractTactics(rule.params),
    platform,
    enabled: rule.enabled,
  };
};

const resolvePatterns = async (
  patterns: string[],
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<string[]> => {
  if (patterns.length === 0) {
    return [];
  }

  try {
    const result = await esClient.indices.resolveIndex({
      name: patterns.join(','),
      expand_wildcards: 'open',
    });

    return [
      ...result.indices.map((i) => i.name),
      ...(result.data_streams?.flatMap((ds) => [ds.name, ...ds.backing_indices]) ?? []),
    ];
  } catch {
    return [];
  }
};

const resolveRuleIndices = async (
  params: RuleParams,
  esClient: ElasticsearchClient,
  dataViewsService: DataViewsService,
  logger: Logger
): Promise<string[]> => {
  const dataViewId = (params as { dataViewId?: string }).dataViewId;
  if (dataViewId) {
    try {
      const dataView = await dataViewsService.get(dataViewId);
      const patterns = dataView.getIndexPattern().split(',').filter(Boolean);
      return resolvePatterns(patterns, esClient, logger);
    } catch {
      // Data view resolution failed, fall through to index patterns
    }
  }

  const index = (params as { index?: string[] }).index;
  if (index && index.length > 0) {
    return resolvePatterns(index, esClient, logger);
  }

  return [];
};

export const fetchRulesReverseMap = async ({
  rulesClient,
  esClient,
  dataViewsService,
  logger,
  packageToPlatform = new Map(),
  categoriesData,
}: FetchRulesReverseMapDeps): Promise<ReverseMapResult> => {
  const indexToRules: IndexToRulesMap = new Map();
  const pipelineToIndices: PipelineToIndicesMap = new Map();
  const categoryToIndices: CategoryToIndicesMap = new Map();
  const tacticTotals: TacticTotals = new Map();
  const mlRules: MachineLearningRuleIndex = [];

  // 1. Build pipeline -> indices map from index settings
  try {
    const allIndicesSettings = await esClient.indices.getSettings({
      index: '*',
      flat_settings: true,
    });

    for (const [indexName, settings] of Object.entries(allIndicesSettings)) {
      const flatSettings = settings.settings as Record<string, string> | undefined;
      const pipeline = flatSettings?.['index.default_pipeline'];
      if (pipeline) {
        const indices = pipelineToIndices.get(pipeline) ?? [];
        indices.push(indexName);
        pipelineToIndices.set(pipeline, indices);
      }
    }
  } catch {
    // Pipeline mapping failed, continue without it
  }

  // 2. Build category -> indices map. Use pre-fetched categoriesData if provided
  //    to avoid a duplicate ES aggregation call when the caller already holds it.
  try {
    const resolvedCategories = categoriesData ?? (await fetchCategories({ esClient, logger }));
    for (const categoryGroup of resolvedCategories.mainCategoriesMap) {
      const indices = categoryGroup.indices.map((idx) => idx.indexName);
      categoryToIndices.set(categoryGroup.category, indices);
    }
  } catch {
    // Category mapping failed, continue without it
  }

  // 3. Build index -> rules map by paginating through all enabled rules
  let searchAfter: SortResults | undefined;
  let pageCount = 0;
  const maxPages = 100;

  do {
    pageCount++;
    if (pageCount > maxPages) {
      break;
    }

    const result = await findRules({
      rulesClient,
      filter: 'alert.attributes.enabled:true',
      perPage: 1000,
      page: undefined,
      sortField: 'createdAt',
      sortOrder: 'asc',
      searchAfter,
    });

    for (const ruleData of result.data) {
      const rule = ruleData as unknown as AlertingRule;
      const entry = buildRuleEntry(rule, packageToPlatform);

      for (const tactic of entry.tactics) {
        const existing = tacticTotals.get(tactic.id);
        tacticTotals.set(tactic.id, {
          id: tactic.id,
          name: tactic.name,
          totalRules: (existing?.totalRules ?? 0) + 1,
        });
      }

      const ruleType = rule.params.type;

      if (ruleType === 'machine_learning') {
        mlRules.push(entry);
        continue;
      }

      const indices = await resolveRuleIndices(rule.params, esClient, dataViewsService, logger);

      for (const index of indices) {
        const existing = indexToRules.get(index) ?? [];
        existing.push(entry);
        indexToRules.set(index, existing);
      }

      if (ruleType === 'threat_match') {
        const threatIndex = (rule.params as { threatIndex?: string[] }).threatIndex;
        if (threatIndex && threatIndex.length > 0) {
          const threatIndices = await resolvePatterns(threatIndex, esClient, logger);
          for (const index of threatIndices) {
            const existing = indexToRules.get(index) ?? [];
            existing.push(entry);
            indexToRules.set(index, existing);
          }
        }
      }
    }

    searchAfter =
      result.data.length > 0
        ? (result.data[result.data.length - 1] as unknown as { sort?: SortResults }).sort
        : undefined;
  } while (searchAfter);

  return { indexToRules, pipelineToIndices, categoryToIndices, tacticTotals, mlRules };
};
