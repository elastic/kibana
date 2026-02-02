/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { GapFillStatus } from '@kbn/alerting-plugin/common/constants/gap_status';

import type { FindRulesSortField } from '../../../../../../common/api/detection_engine/rule_management';
import type { SortOrder } from '../../../../../../common/api/detection_engine';
import { findRules } from './find_rules';

/**
 * Filters rule IDs with gaps by applying the user's filter.
 * Splits the rule IDs into batches and processes them sequentially so we can
 * stop early once we've collected enough results to return.
 * Then return maxRuleIds of them.
 */
const filterRuleIdsWithGaps = async ({
  rulesClient,
  ruleIdsWithGaps,
  filter,
  maxRuleIds,
  sortField,
  sortOrder,
}: {
  rulesClient: RulesClient;
  ruleIdsWithGaps: string[];
  filter: string;
  maxRuleIds: number;
  sortField?: FindRulesSortField;
  sortOrder?: SortOrder;
}): Promise<{
  ruleIds: string[];
  truncated: boolean;
}> => {
  // Split rule IDs into batches to avoid exceeding ES max clause limits
  const batches = chunk(ruleIdsWithGaps, maxRuleIds);

  const allMatchingRuleIds: string[] = [];

  // Process batches sequentially so we can stop once we have enough results to know
  // whether the response should be truncated.
  for (const batch of batches) {
    const result = await findRules({
      rulesClient,
      perPage: maxRuleIds,
      page: 1,
      sortField,
      sortOrder,
      filter,
      ruleIds: batch,
      fields: ['id'],
    });

    allMatchingRuleIds.push(...result.data.map((rule) => rule.id));

    if (allMatchingRuleIds.length > maxRuleIds) {
      break;
    }
  }

  const truncated = allMatchingRuleIds.length > maxRuleIds;
  const finalRuleIds = allMatchingRuleIds.slice(0, maxRuleIds);

  return {
    ruleIds: finalRuleIds,
    truncated,
  };
};

export interface GapFilteredRuleIdsOptions {
  rulesClient: RulesClient;
  gapRange: { start: string; end: string };
  gapFillStatuses: GapFillStatus[];
  maxRuleIds: number;
  filter?: string;
  sortField?: FindRulesSortField;
  sortOrder?: SortOrder;
}

export interface GapFilteredRuleIdsResult {
  ruleIds: string[];
  truncated: boolean;
}

/**
 * Returns rule IDs that:
 * - have gap fill status in the specified range and
 * - match the provided rule-level filter
 * - are capped at maxRuleIds to avoid exceeding ES max clause limits.
 */
export const getGapFilteredRuleIds = async ({
  rulesClient,
  gapRange,
  gapFillStatuses,
  maxRuleIds,
  filter,
  sortField,
  sortOrder,
}: GapFilteredRuleIdsOptions): Promise<GapFilteredRuleIdsResult> => {
  // Step 1: get ALL rule IDs with gaps for the selected range and gap fill statuses
  const ruleIdsWithGaps = await rulesClient.getRuleIdsWithGaps({
    highestPriorityGapFillStatuses: gapFillStatuses,
    start: gapRange.start,
    end: gapRange.end,
  });

  const initialRuleIds = ruleIdsWithGaps.ruleIds.slice(0, maxRuleIds);
  const gapsTruncated = ruleIdsWithGaps.ruleIds.length > maxRuleIds;

  // If the number of rules with gaps is under our cap, or no filter is applied,
  // we can just return them directly.
  if (!gapsTruncated || !filter) {
    return {
      ruleIds: initialRuleIds,
      truncated: gapsTruncated,
    };
  }

  // Step 2: There are many rules with gaps AND a filter is applied.
  // Filter the rule IDs with gaps by the user's filter.
  // This ensures we return rules that HAVE gaps AND match the filter,
  return filterRuleIdsWithGaps({
    rulesClient,
    ruleIdsWithGaps: ruleIdsWithGaps.ruleIds,
    filter,
    maxRuleIds,
    sortField,
    sortOrder,
  });
};
