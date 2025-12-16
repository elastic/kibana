/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { GapFillStatus } from '@kbn/alerting-plugin/common/constants/gap_status';

import type { FindRulesSortField } from '../../../../../../common/api/detection_engine/rule_management';
import type { SortOrder } from '../../../../../../common/api/detection_engine';
import { findRules } from './find_rules';

interface CollectRuleIdsByFilterOptions {
  rulesClient: RulesClient;
  maxRuleIdsToCollect: number;
  filter: string;
  sortField?: FindRulesSortField;
  sortOrder?: SortOrder;
}

/**
 * Collects up to maxRuleIdsToCollect rule IDs that match the provided filter.
 */
const collectRuleIdsByFilter = async ({
  rulesClient,
  maxRuleIdsToCollect,
  filter,
  sortField,
  sortOrder,
}: CollectRuleIdsByFilterOptions): Promise<{
  ruleIds: string[];
  truncated: boolean;
}> => {
  const ruleIds: string[] = [];
  const batchSize = 250;
  let page = 1;
  let continuePaging = true;
  let total = 0;

  while (continuePaging) {
    const pageResult = await findRules({
      rulesClient,
      perPage: batchSize,
      page,
      sortField,
      sortOrder,
      filter,
      fields: ['id'],
    });

    total = pageResult.total;

    if (pageResult.data.length === 0) {
      break;
    }

    for (const rule of pageResult.data) {
      ruleIds.push(rule.id);
      if (ruleIds.length >= maxRuleIdsToCollect) {
        continuePaging = false;
        break;
      }
    }

    page += 1;
  }

  return {
    ruleIds,
    truncated: total > maxRuleIdsToCollect,
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
  // Step 1: get rule IDs with gaps for the selected range and gap fill statuses
  const initialRuleIdsWithGaps = await rulesClient.getRuleIdsWithGaps({
    highestPriorityGapFillStatuses: gapFillStatuses,
    start: gapRange.start,
    end: gapRange.end,
  });

  const initialRuleIds = initialRuleIdsWithGaps.ruleIds.slice(0, maxRuleIds);
  const gapsTruncated = initialRuleIdsWithGaps.ruleIds.length > maxRuleIds;

  // If the number of rules with gaps is already under our cap, we can just return it.
  if (!gapsTruncated || !filter) {
    return {
      ruleIds: initialRuleIds,
      truncated: gapsTruncated,
    };
  }

  // Otherwise, there are many rules with gaps and a rule-level filter is applied.
  // We first collect up to maxRuleIds candidate rule IDs that match the user's filters,
  // then restrict the gaps query to that candidate set.
  const { ruleIds: candidateRuleIds, truncated: candidatesTruncated } =
    await collectRuleIdsByFilter({
      rulesClient,
      maxRuleIdsToCollect: maxRuleIds,
      filter,
      sortField,
      sortOrder,
    });

  if (candidateRuleIds.length === 0) {
    return {
      ruleIds: [],
      truncated: false,
    };
  }

  const narrowedRuleIdsWithGaps = await rulesClient.getRuleIdsWithGaps({
    highestPriorityGapFillStatuses: gapFillStatuses,
    start: gapRange.start,
    end: gapRange.end,
    ruleIds: candidateRuleIds,
  });

  return {
    ruleIds: narrowedRuleIdsWithGaps.ruleIds,
    truncated: candidatesTruncated,
  };
};
