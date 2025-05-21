/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { gapStatus } from '@kbn/alerting-plugin/common';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../../../common/constants';
import type { PromisePoolOutcome } from '../../../../../../utils/promise_pool';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import type { RuleAlertType } from '../../../../rule_schema';
import { readRules } from '../../../logic/detection_rules_client/read_rules';
import { findRules } from '../../../logic/search/find_rules';

export const fetchRulesByQueryOrIds = async ({
  query,
  ids,
  rulesClient,
  abortSignal,
  maxRules,
  gapRange,
}: {
  query: string | undefined;
  ids: string[] | undefined;
  rulesClient: RulesClient;
  abortSignal: AbortSignal;
  maxRules: number;
  gapRange?: { start: string; end: string };
}): Promise<PromisePoolOutcome<string, RuleAlertType>> => {
  if (ids) {
    return initPromisePool({
      concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
      items: ids,
      executor: async (id: string) => {
        const rule = await readRules({ id, rulesClient, ruleId: undefined });
        if (rule == null) {
          throw Error('Rule not found');
        }
        return rule;
      },
      abortSignal,
    });
  }

  let ruleIdsWithGaps: string[] | undefined;
  // If there is a gap range, we need to find the rules that have gaps in that range
  if (gapRange) {
    const ruleIdsWithGapsResponse = await rulesClient.getRuleIdsWithGaps({
      start: gapRange.start,
      end: gapRange.end,
      statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
    });
    ruleIdsWithGaps = ruleIdsWithGapsResponse.ruleIds;
    if (ruleIdsWithGaps.length === 0) {
      return {
        results: [],
        errors: [],
      };
    }
  }

  const { data, total } = await findRules({
    rulesClient,
    perPage: maxRules,
    filter: query,
    page: undefined,
    sortField: undefined,
    sortOrder: undefined,
    fields: undefined,
    ruleIds: ruleIdsWithGaps,
  });

  if (total > maxRules) {
    throw new BadRequestError(
      `More than ${maxRules} rules matched the filter query. Try to narrow it down.`
    );
  }

  return {
    results: data.map((rule) => ({ item: rule.id, result: rule })),
    errors: [],
  };
};
