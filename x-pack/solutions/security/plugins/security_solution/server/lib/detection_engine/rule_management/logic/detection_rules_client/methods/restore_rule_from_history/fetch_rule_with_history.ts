/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangeHistoryDocument, RulesClient } from '@kbn/alerting-plugin/server';
import type {
  RuleResponse,
  RuleObjectId,
} from '../../../../../../../../common/api/detection_engine/model/rule_schema';
import { ClientError } from '../../utils';
import { getRuleById } from '../get_rule_by_id';

interface FetchRuleWithHistoryParams {
  rulesClient: RulesClient;
  ruleId: RuleObjectId;
  changeId: string;
}

export async function fetchRuleWithHistory({
  rulesClient,
  ruleId,
  changeId,
}: FetchRuleWithHistoryParams): Promise<{
  existingRule: RuleResponse | null;
  historyItem: RuleChangeHistoryDocument;
}> {
  const existingRule = await getRuleById({ rulesClient, id: ruleId });

  // `from` is intentionally omitted: the event.id term-filter makes the target
  // document the first (and only) hit; ES default of 0 is correct here.
  const historyResult = await rulesClient.getHistory({
    module: 'security',
    ruleId,
    size: 1,
    filters: [{ term: { 'event.id': changeId } }],
  });

  if (historyResult.items.length > 0) {
    return { existingRule, historyItem: historyResult.items[0] };
  }

  if (existingRule != null) {
    throw new ClientError(`changeId: "${changeId}" not found`, 404);
  }

  // The changeId filter alone can't tell "no history for this ruleId" apart
  // from "history exists, but not for this changeId" — probe unfiltered.
  const anyHistoryResult = await rulesClient.getHistory({
    module: 'security',
    ruleId,
    size: 1,
  });

  if (anyHistoryResult.items.length === 0) {
    throw new ClientError(`ruleId: "${ruleId}" not found`, 404);
  }

  throw new ClientError(`changeId: "${changeId}" not found`, 404);
}
