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

      const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
      const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

      const installedRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
      const installedRuleVersionsMap = new Map(
        installedRuleVersions.map((version) => [version.rule_id, version])
      );

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

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              installable_runnable_rules: runnableRules.map((asset) => ({
                rule_id: asset.rule_id,
                name: asset.name,
                description: asset.description,
                severity: asset.severity,
                type: asset.type,
                index_patterns: [...(getIndexPatterns(asset) ?? [])],
                required_fields: (asset.required_fields ?? []).map((field) => ({
                  name: field.name,
                  type: field.type,
                })),
                tags: asset.tags ?? [],
              })),
              stats: {
                total_installable: installableAssets.length,
                filtered_no_matching_indices: filteredNoMatchingIndices,
                filtered_missing_required_fields: filteredMissingRequiredFields,
                filtered_unsupported_for_v1: filteredUnsupportedForV1,
                total_returned: runnableRules.length,
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
