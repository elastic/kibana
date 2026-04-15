/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { GapFillStatus } from '@kbn/alerting-plugin/common/constants/gap_status';
import type { GapReasonType } from '@kbn/alerting-plugin/common/constants/gap_reason';

import type { FindRulesSortField } from '../../../../../../common/api/detection_engine/rule_management';
import type { SortOrder } from '../../../../../../common/api/detection_engine';
import { findRules } from './find_rules';

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
  const batches = chunk(ruleIdsWithGaps, maxRuleIds);
  const allMatchingRuleIds: string[] = [];

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
  excludedReasons?: GapReasonType[];
  schedulerId?: string;
}

export interface GapFilteredRuleIdsResult {
  ruleIds: string[];
  truncated: boolean;
}

export const getGapFilteredRuleIds = async ({
  rulesClient,
  gapRange,
  gapFillStatuses,
  maxRuleIds,
  filter,
  sortField,
  sortOrder,
  excludedReasons,
  schedulerId,
}: GapFilteredRuleIdsOptions): Promise<GapFilteredRuleIdsResult> => {
  const ruleIdsWithGaps = await rulesClient.getRuleIdsWithGaps({
    highestPriorityGapFillStatuses: gapFillStatuses,
    start: gapRange.start,
    end: gapRange.end,
    excludedReasons,
    schedulerId,
  });

  const initialRuleIds = ruleIdsWithGaps.ruleIds.slice(0, maxRuleIds);
  const gapsTruncated = ruleIdsWithGaps.ruleIds.length > maxRuleIds;

  if (!gapsTruncated || !filter) {
    return {
      ruleIds: initialRuleIds,
      truncated: gapsTruncated,
    };
  }

  return filterRuleIdsWithGaps({
    rulesClient,
    ruleIdsWithGaps: ruleIdsWithGaps.ruleIds,
    filter,
    maxRuleIds,
    sortField,
    sortOrder,
  });
};
