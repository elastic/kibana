/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { RulesNotFoundError, RulesNotVisibleError } from '@kbn/alerting-plugin/server';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type { GapFillStatus } from '@kbn/alerting-plugin/common/constants/gap_status';
import { MAX_RULES_WITH_GAPS_TO_FETCH } from '../../../../../../../common/constants';
import type { PromisePoolOutcome } from '../../../../../../utils/promise_pool';
import type { RuleAlertType } from '../../../../rule_schema';
import { findRules } from '../../../logic/search/find_rules';
import { getGapFilteredRuleIds } from '../../../logic/search/get_gap_filtered_rule_ids';

/**
 * Returned for rule ids that could not be found while fetching rules for a bulk action.
 */
export class RuleNotFoundError extends Error {
  constructor() {
    super('Rule not found');
    this.name = 'RuleNotFoundError';
  }
}

export const fetchRulesByQueryOrIds = async ({
  query,
  ids,
  rulesClient,
  maxRules,
  gapRange,
  gapFillStatuses,
  schedulerId,
}: {
  query: string | undefined;
  ids: string[] | undefined;
  rulesClient: RulesClient;
  maxRules: number;
  gapRange?: { start: string; end: string };
  gapFillStatuses?: GapFillStatus[];
  schedulerId?: string;
}): Promise<PromisePoolOutcome<string, RuleAlertType>> => {
  if (ids) {
    const fallbackErrorMessage = 'Error resolving the rule';
    try {
      const { rules, errors } = await rulesClient.bulkGetRules({ ids });
      return {
        results: rules.map((rule) => ({
          item: rule.id,
          result: rule,
        })),
        errors: errors.map(({ id, error }) => ({
          item: id,
          error:
            error.statusCode === 404 ? new RuleNotFoundError() : new Error(fallbackErrorMessage),
        })),
      };
    } catch (error) {
      // When there is an authorization error or it doesn't resolve any rule,
      // bulkGetRules will not return a partial object but throw an error instead.
      const isRuleNotFound =
        error instanceof RulesNotFoundError || error instanceof RulesNotVisibleError;
      return {
        results: [],
        errors: ids.map((id) => ({
          item: id,
          // We do this to remove any status code set by the bulkGetRules client
          error: isRuleNotFound
            ? new RuleNotFoundError()
            : new Error(error.message || fallbackErrorMessage),
        })),
      };
    }
  }

  let ruleIdsWithGaps: string[] | undefined;
  // If there is a gap range, we need to find the rules that have gaps in that range
  if (gapRange && gapFillStatuses && gapFillStatuses.length > 0) {
    const { ruleIds } = await getGapFilteredRuleIds({
      rulesClient,
      gapRange,
      gapFillStatuses,
      maxRuleIds: MAX_RULES_WITH_GAPS_TO_FETCH,
      filter: query,
      schedulerId,
    });

    ruleIdsWithGaps = ruleIds;

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
