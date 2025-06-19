/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { gapStatus } from '@kbn/alerting-plugin/common';
import type { PromisePoolOutcome } from '../../../../../../utils/promise_pool';
import type { RuleAlertType } from '../../../../rule_schema';
import { findRules } from '../../../logic/search/find_rules';

export const fetchRulesByQueryOrIds = async ({
  query,
  ids,
  rulesClient,
  maxRules,
  gapRange,
}: {
  query: string | undefined;
  ids: string[] | undefined;
  rulesClient: RulesClient;
  maxRules: number;
  gapRange?: { start: string; end: string };
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
        errors: errors.map(({ id, error }) => {
          let message = fallbackErrorMessage;
          if (error.statusCode === 404) {
            message = 'Rule not found';
          }
          return {
            item: id,
            error: new Error(message),
          };
        }),
      };
    } catch (error) {
      // When there is an authorization error or it doesn't resolve any rule,
      // bulkGetRules will not return a partial object but throw an error instead.
      let message = error.message || fallbackErrorMessage;
      if (error.message === 'No rules found for bulk get') {
        message = 'Rule not found';
      }
      return {
        results: [],
        errors: ids.map((id) => {
          return {
            item: id,
            // We do this to remove any status code set by the bulkGetRules client
            error: new Error(message),
          };
        }),
      };
    }
  }

  let ruleIdsWithGaps: string[] | undefined;
  // If there is a gap range, we need to find the rules that have gaps in that range
  if (gapRange) {
    const ruleIdsWithGapsResponse = await rulesClient.getRuleIdsWithGaps({
      start: gapRange.start,
      end: gapRange.end,
      statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
      hasUnfilledIntervals: true,
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
