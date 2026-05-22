/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';
import { securityTool } from './constants';
import { createPrebuiltRuleAssetsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { getInstallableRuleVersions } from '../../lib/detection_engine/prebuilt_rules/api/review_rule_installation/review_rule_installation_handler';
import type { MlAuthz } from '../../lib/machine_learning/authz';
import type { PrebuiltRuleAsset } from '../../lib/detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset';

export const SECURITY_RECOMMEND_RULES_TO_INSTALL_TOOL_ID = securityTool(
  'recommend_rules_to_install'
);

const recommendRulesToInstallSchema = z
  .object({})
  .describe(
    'No parameters required. Returns all installable prebuilt detection rules that are also runnable on this deployment.'
  );

// v1 demo only: skips the real ML license / admin check. Acceptable because the
// runnability filter (index pattern + required fields) already excludes ML rules
// without matching data. Replace with a licensing-derived MlAuthz in a follow-up.
const permissiveMlAuthz: MlAuthz = {
  validateRuleType: async () => ({ valid: true, message: undefined }),
};

interface RunnabilityFilterResult {
  runnableRules: PrebuiltRuleAsset[];
  filteredNoMatchingIndices: number;
  filteredMissingRequiredFields: number;
  filteredUnsupportedForV1: number;
}

type AssetVerdict =
  | { kind: 'runnable'; asset: PrebuiltRuleAsset }
  | { kind: 'no_matching_indices' }
  | { kind: 'missing_required_fields' }
  | { kind: 'unsupported_for_v1' };

const getIndexPatterns = (asset: PrebuiltRuleAsset): readonly string[] | undefined => {
  if ('index' in asset) {
    const candidate = (asset as { index?: unknown }).index;
    if (Array.isArray(candidate) && candidate.every((p): p is string => typeof p === 'string')) {
      return candidate;
    }
  }
  return undefined;
};

const evaluateAsset = async (
  asset: PrebuiltRuleAsset,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<AssetVerdict> => {
  const indexPatterns = getIndexPatterns(asset);
  const requiredFields = asset.required_fields ?? [];

  // v1 only handles rules that declare both `index` and `required_fields`.
  // ML rules and ES|QL rules fall through here and are excluded from the demo.
  if (!indexPatterns || indexPatterns.length === 0 || requiredFields.length === 0) {
    return { kind: 'unsupported_for_v1' };
  }

  try {
    const fieldCaps = await esClient.fieldCaps({
      index: [...indexPatterns],
      fields: requiredFields.map((field) => field.name),
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    const matchedIndices = Array.isArray(fieldCaps.indices)
      ? fieldCaps.indices
      : fieldCaps.indices
      ? [fieldCaps.indices]
      : [];

    if (matchedIndices.length === 0) {
      return { kind: 'no_matching_indices' };
    }

    const presentFields = new Set(Object.keys(fieldCaps.fields ?? {}));
    // Every required field must have a mapping in at least one matched index
    const allPresent = requiredFields.every((field) => presentFields.has(field.name));
    if (!allPresent) {
      return { kind: 'missing_required_fields' };
    }

    return { kind: 'runnable', asset };
  } catch (err) {
    logger.warn(
      `recommendRulesToInstallTool: fieldCaps failed for rule ${asset.rule_id}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return { kind: 'no_matching_indices' };
  }
};

const truncateDescription = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) {
    return text;
  }
  const sliced = text.slice(0, maxChars);
  const lastSentenceEnd = sliced.lastIndexOf('. ');
  if (lastSentenceEnd > maxChars * 0.5) {
    return sliced.slice(0, lastSentenceEnd + 1);
  }
  return `${sliced.trimEnd()}…`;
};

const stripTagPrefix = (tags: readonly string[], prefix: string): string[] =>
  tags.filter((tag) => tag.startsWith(prefix)).map((tag) => tag.slice(prefix.length).trim());

const buildRuleCard = (asset: PrebuiltRuleAsset) => {
  const tags = asset.tags ?? [];
  return {
    rule_id: asset.rule_id,
    name: asset.name,
    description: truncateDescription(asset.description, 300),
    severity: asset.severity,
    domain: stripTagPrefix(tags, 'Domain: '),
    os: stripTagPrefix(tags, 'OS: '),
    data_sources: stripTagPrefix(tags, 'Data Source: '),
    mitre_tactics: (asset.threat ?? []).map((entry) => ({
      id: entry.tactic.id,
      name: entry.tactic.name,
    })),
  };
};

const filterRunnableRules = async (
  installableAssets: readonly PrebuiltRuleAsset[],
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<RunnabilityFilterResult> => {
  const verdicts = await Promise.all(
    installableAssets.map((asset) => evaluateAsset(asset, esClient, logger))
  );

  const result: RunnabilityFilterResult = {
    runnableRules: [],
    filteredNoMatchingIndices: 0,
    filteredMissingRequiredFields: 0,
    filteredUnsupportedForV1: 0,
  };

  for (const verdict of verdicts) {
    if (verdict.kind === 'runnable') {
      result.runnableRules.push(verdict.asset);
    } else if (verdict.kind === 'no_matching_indices') {
      result.filteredNoMatchingIndices += 1;
    } else if (verdict.kind === 'missing_required_fields') {
      result.filteredMissingRequiredFields += 1;
    } else {
      result.filteredUnsupportedForV1 += 1;
    }
  }

  return result;
};

// ---- Pre-ranking ----
//
// Trims the runnable candidate set to a budgeted list, biased toward filling
// kill-chain gaps. Each tactic earns "points" based on how many installed
// rules already cover it (empty > sparse > covered); the budget is split
// proportionally across tactics, clamped per-tactic to a [MIN, MAX] band,
// and bounded by the number of available candidates. Within each tactic's
// allocation, rules are ranked by risk_score desc. Rules mapped to multiple
// tactics may be picked via any of them; the final list is deduped by
// rule_id, so the total can come in under budget — that's fine.

const RECOMMENDATION_BUDGET = 200;
const MIN_PER_TACTIC = 3;
const MAX_PER_TACTIC = 25;
const TACTIC_WEIGHT_EMPTY = 3;
const TACTIC_WEIGHT_SPARSE = 2;
const TACTIC_WEIGHT_COVERED = 1;
const SPARSE_INSTALLED_THRESHOLD = 3;

interface PreRankResult {
  recommendations: PrebuiltRuleAsset[];
  allocationsByTactic: Record<string, number>;
}

const getTacticWeight = (installedCount: number): number => {
  if (installedCount === 0) return TACTIC_WEIGHT_EMPTY;
  if (installedCount <= SPARSE_INSTALLED_THRESHOLD) return TACTIC_WEIGHT_SPARSE;
  return TACTIC_WEIGHT_COVERED;
};

const sortByRiskScoreDesc = (a: PrebuiltRuleAsset, b: PrebuiltRuleAsset): number => {
  const aScore = typeof a.risk_score === 'number' ? a.risk_score : 0;
  const bScore = typeof b.risk_score === 'number' ? b.risk_score : 0;
  return bScore - aScore;
};

export const preRankCandidateRules = (
  runnableRules: readonly PrebuiltRuleAsset[],
  installedCoverageByTactic: Readonly<Record<string, { name: string; installed_count: number }>>,
  budget: number = RECOMMENDATION_BUDGET
): PreRankResult => {
  // Bucket runnable rules by tactic. A rule mapped to multiple tactics appears
  // in each bucket; dedupe within a single rule's threat[] in case it lists
  // the same tactic twice (different techniques under the same tactic).
  const candidatesByTactic = new Map<string, PrebuiltRuleAsset[]>();
  for (const rule of runnableRules) {
    const seen = new Set<string>();
    for (const entry of rule.threat ?? []) {
      const tacticId = entry.tactic.id;
      if (!seen.has(tacticId)) {
        seen.add(tacticId);
        const bucket = candidatesByTactic.get(tacticId) ?? [];
        bucket.push(rule);
        candidatesByTactic.set(tacticId, bucket);
      }
    }
  }

  // Consider any tactic that has candidates or installed rules.
  const allTacticIds = new Set<string>([
    ...candidatesByTactic.keys(),
    ...Object.keys(installedCoverageByTactic),
  ]);

  // Compute weights and sum points across tactics that have at least one
  // candidate. Tactics without candidates cannot be filled and shouldn't
  // burn budget.
  const tacticWeights = new Map<string, number>();
  let totalPoints = 0;
  for (const tacticId of allTacticIds) {
    const installedCount = installedCoverageByTactic[tacticId]?.installed_count ?? 0;
    const weight = getTacticWeight(installedCount);
    tacticWeights.set(tacticId, weight);
    if ((candidatesByTactic.get(tacticId)?.length ?? 0) > 0) {
      totalPoints += weight;
    }
  }

  // Allocate: proportional split, clamp to [MIN, MAX], bound by candidate count.
  const allocations = new Map<string, number>();
  for (const tacticId of allTacticIds) {
    const candidateCount = candidatesByTactic.get(tacticId)?.length ?? 0;
    if (candidateCount === 0) {
      allocations.set(tacticId, 0);
    } else {
      const weight = tacticWeights.get(tacticId) ?? 0;
      const proportional = totalPoints > 0 ? Math.floor((weight / totalPoints) * budget) : 0;
      const clamped = Math.min(MAX_PER_TACTIC, Math.max(MIN_PER_TACTIC, proportional));
      allocations.set(tacticId, Math.min(clamped, candidateCount));
    }
  }

  // For each tactic, sort by risk_score desc and take its allocation.
  const picks: PrebuiltRuleAsset[] = [];
  for (const [tacticId, allocation] of allocations) {
    const bucket = allocation > 0 ? candidatesByTactic.get(tacticId) : undefined;
    if (bucket) {
      picks.push(...[...bucket].sort(sortByRiskScoreDesc).slice(0, allocation));
    }
  }

  // Dedupe by rule_id, preserving first occurrence. A rule that fills multiple
  // tactics is emitted once; the per-tactic counts in the output may exceed
  // the actual rule count, which is the expected accounting.
  const seenRuleIds = new Set<string>();
  const recommendations: PrebuiltRuleAsset[] = [];
  for (const rule of picks) {
    if (!seenRuleIds.has(rule.rule_id)) {
      seenRuleIds.add(rule.rule_id);
      recommendations.push(rule);
    }
  }

  const allocationsByTactic: Record<string, number> = {};
  for (const [tacticId, allocation] of allocations) {
    allocationsByTactic[tacticId] = allocation;
  }

  return { recommendations, allocationsByTactic };
};

export const recommendRulesToInstallTool = (
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger
): BuiltinToolDefinition<typeof recommendRulesToInstallSchema> => ({
  id: SECURITY_RECOMMEND_RULES_TO_INSTALL_TOOL_ID,
  type: ToolType.builtin,
  description:
    "Returns Elastic Security prebuilt detection rules that are both installable on this deployment and runnable on the available data (index patterns match real indices; required fields exist in those indices' mappings). Use when the user asks which rules to install, what rules to enable, or for prebuilt rule recommendations.",
  schema: recommendRulesToInstallSchema,
  tags: ['security', 'detection', 'rule-management', 'siem'],
  handler: async (_args, { esClient, request }) => {
    try {
      const [coreStart, startPlugins] = await core.getStartServices();
      const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
      const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

      // Resolve the active Kibana space so the LLM can construct links that
      // land users on the correct space-scoped page. Default space has id
      // 'default' and uses no URL prefix; custom spaces use /s/<id>.
      const activeSpace = await startPlugins.spaces?.spacesService.getActiveSpace(request);
      const spaceUrlPrefix =
        activeSpace && activeSpace.id !== 'default' ? `/s/${activeSpace.id}` : '';

      const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
      const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

      const installedRules = await ruleObjectsClient.fetchInstalledRules();
      const installedRuleVersionsMap = new Map(installedRules.map((rule) => [rule.rule_id, rule]));

      const installedCoverageByTactic: Record<string, { name: string; installed_count: number }> =
        {};
      for (const rule of installedRules) {
        const seenTactics = new Set<string>();
        for (const entry of rule.threat ?? []) {
          const { id, name } = entry.tactic;
          if (!seenTactics.has(id)) {
            seenTactics.add(id);
            if (!installedCoverageByTactic[id]) {
              installedCoverageByTactic[id] = { name, installed_count: 0 };
            }
            installedCoverageByTactic[id].installed_count += 1;
          }
        }
      }

      const installableVersions = await getInstallableRuleVersions(
        ruleAssetsClient,
        logger,
        permissiveMlAuthz,
        installedRuleVersionsMap
      );

      const installableAssets = await ruleAssetsClient.fetchAssetsByVersion(installableVersions);

      const {
        runnableRules,
        filteredNoMatchingIndices,
        filteredMissingRequiredFields,
        filteredUnsupportedForV1,
      } = await filterRunnableRules(installableAssets, esClient.asCurrentUser, logger);

      const { recommendations, allocationsByTactic } = preRankCandidateRules(
        runnableRules,
        installedCoverageByTactic
      );

      // Merge per-tactic allocation into the coverage diagnostic so the LLM
      // sees both "what's already covered" and "how many candidates I'm
      // sending for each tactic." Include every tactic that appears on either
      // side (installed-only, candidate-only, or both).
      const coverageWithAllocation: Record<
        string,
        { name: string; installed_count: number; allocation: number }
      > = {};
      const allTacticIds = new Set<string>([
        ...Object.keys(installedCoverageByTactic),
        ...Object.keys(allocationsByTactic),
      ]);
      for (const tacticId of allTacticIds) {
        coverageWithAllocation[tacticId] = {
          name: installedCoverageByTactic[tacticId]?.name ?? tacticId,
          installed_count: installedCoverageByTactic[tacticId]?.installed_count ?? 0,
          allocation: allocationsByTactic[tacticId] ?? 0,
        };
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              space_url_prefix: spaceUrlPrefix,
              installable_runnable_rules: recommendations.map(buildRuleCard),
              installed_coverage_by_tactic: coverageWithAllocation,
              stats: {
                total_installable: installableAssets.length,
                filtered_no_matching_indices: filteredNoMatchingIndices,
                filtered_missing_required_fields: filteredMissingRequiredFields,
                filtered_unsupported_for_v1: filteredUnsupportedForV1,
                total_runnable: runnableRules.length,
                total_recommended: recommendations.length,
              },
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`recommendRulesToInstallTool failed: ${message}`, error);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to fetch rule recommendations: ${message}` },
          },
        ],
      };
    }
  },
});
