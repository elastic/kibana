/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleObjectId } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type {
  RuleChangesHistoryResponse,
  RuleHistoryItem,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { mapRuleHistoryItem } from '../../history/map_rule_history_item';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

export interface GetHistoryForRuleArgs {
  rulesClient: RulesClient;
  ruleId: RuleObjectId;
  page?: number;
  perPage?: number;
}

export const getHistoryForRule = async ({
  rulesClient,
  ruleId,
  page = DEFAULT_PAGE,
  perPage = DEFAULT_PER_PAGE,
}: GetHistoryForRuleArgs): Promise<RuleChangesHistoryResponse> => {
  // Fetch one extra entry past the requested page so the oldest item on the
  // page can be paired with its predecessor (older revision) for `old_values`.
  const result = await rulesClient.getHistory({
    module: 'security',
    ruleId,
    from: (page - 1) * perPage,
    size: perPage + 1,
  });

  const fetchedItems = result.items;
  const resultItems: RuleHistoryItem[] = [];

  for (let i = 0; i < Math.min(perPage, fetchedItems.length); ++i) {
    resultItems.push(mapRuleHistoryItem(fetchedItems[i], fetchedItems[i + 1]));
  }

  return {
    page,
    perPage,
    total: result.total,
    items: resultItems,
  };
};
