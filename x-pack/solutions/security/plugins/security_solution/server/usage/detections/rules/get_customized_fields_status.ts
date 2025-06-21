/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { PrebuiltRuleAsset } from '../../../lib/detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import type { CalculateRuleDiffResult } from '../../../lib/detection_engine/prebuilt_rules/logic/diff/calculate_rule_diff';
import { calculateRuleDiff } from '../../../lib/detection_engine/prebuilt_rules/logic/diff/calculate_rule_diff';
import { createPrebuiltRuleAssetsClient } from '../../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { ThreeWayDiffOutcome } from '../../../../common/api/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_diff_outcome';

export interface CustomizedFieldsStats {
  rules_with_missing_base_version: number;
  customized_fields_breakdown: Array<{ field: string; count: number }>;
}

export interface GetCustomizedFieldsStatsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  ruleResponsesForPrebuiltRules: RuleResponse[];
  logger: Logger;
}

export const getCustomizedFieldsStatus = async ({
  savedObjectsClient,
  ruleResponsesForPrebuiltRules,
  logger,
}: GetCustomizedFieldsStatsOptions): Promise<CustomizedFieldsStats> => {
  try {
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);

    const prebuiltRuleVersions = ruleResponsesForPrebuiltRules.map((rule) => ({
      rule_id: rule.rule_id,
      version: rule.version,
    }));
    const prebuiltRuleAssets = await ruleAssetsClient.fetchAssetsByVersion(prebuiltRuleVersions);
    if (!prebuiltRuleAssets || !prebuiltRuleAssets.length) {
      logger.warn(
        'No prebuilt rule assets found for the provided rule responses. Returning empty stats.'
      );
      return { rules_with_missing_base_version: 0, customized_fields_breakdown: [] };
    }
    const ruleIdToRuleResponseMap = new Map<string, RuleResponse>(
      ruleResponsesForPrebuiltRules.map((ruleResponse) => [ruleResponse.rule_id, ruleResponse])
    );
    const diffResult = await calculateFieldsDiffsInBatches(
      prebuiltRuleAssets,
      ruleIdToRuleResponseMap,
      logger
    );

    return {
      rules_with_missing_base_version: ruleIdToRuleResponseMap.size - prebuiltRuleAssets.length,
      customized_fields_breakdown: calculateFieldsBreakdown(diffResult),
    };
  } catch (err) {
    logger.error(
      `Failed to get customized fields stats: ${err instanceof Error ? err.message : String(err)}`
    );

    return { rules_with_missing_base_version: 0, customized_fields_breakdown: [] };
  }
};

async function calculateFieldsDiffsInBatches(
  prebuiltRuleAssets: PrebuiltRuleAsset[],
  ruleIdToRuleResponseMap: Map<string, RuleResponse>,
  logger: Logger
) {
  const BATCH_SIZE = 25;
  const diffResult: CalculateRuleDiffResult[] = [];
  let failuresCount = 0;

  for (let i = 0; i < prebuiltRuleAssets.length; i += BATCH_SIZE) {
    const batch = prebuiltRuleAssets.slice(i, i + BATCH_SIZE);
    let batchDiffResults: CalculateRuleDiffResult[] = [];
    batchDiffResults = batch
      .map((asset) => {
        try {
          return calculateRuleDiff({
            current: ruleIdToRuleResponseMap.get(asset.rule_id),
            base: asset,
            target: asset,
          });
        } catch (err) {
          logger.error(
            `Failed to calculate rule diff for rule with rule_id: ${asset.rule_id}, version: ${
              asset.version
            }): ${err instanceof Error ? err.message : String(err)}`
          );
          failuresCount++;
          return null;
        }
      })
      .filter(Boolean) as CalculateRuleDiffResult[];

    diffResult.push(...batchDiffResults);

    const processed = Math.min(i + BATCH_SIZE, prebuiltRuleAssets.length);
    logger.debug(
      `Processed fields diffs of ${processed} out of ${
        prebuiltRuleAssets.length
      } rules (failed in this batch: ${batch.length - batchDiffResults.length})`
    );

    // Small delay between batches to prevent cluster overload
    if (processed < prebuiltRuleAssets.length) {
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
    }
  }

  logger.info(
    `Successfully calculated fields diffs for ${diffResult.length} out of ${prebuiltRuleAssets.length} rules.`
  );
  if (failuresCount > 0) {
    logger.warn(
      `Some rules failed to calculate fields diffs, check the logs for more details. Total failures: ${failuresCount}`
    );
  }

  return diffResult;
}

function calculateFieldsBreakdown(
  diffResult: CalculateRuleDiffResult[]
): Array<{ field: string; count: number }> {
  const fieldCounts = diffResult
    .flatMap((diff) =>
      Object.entries(diff.ruleDiff?.fields ?? {})
        .filter(
          ([, fieldDiff]) => fieldDiff.diff_outcome === ThreeWayDiffOutcome.CustomizedValueNoUpdate
        )
        .map(([fieldName]) => fieldName)
    )
    .reduce<Record<string, number>>((acc, field) => {
      acc[field] = (acc[field] ?? 0) + 1;
      return acc;
    }, {});

  return Object.entries(fieldCounts).map(([field, count]) => ({ field, count }));
}
