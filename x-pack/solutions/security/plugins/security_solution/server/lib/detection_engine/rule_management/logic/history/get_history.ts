/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server/rules_client/rules_client';
import type { RuleChangeHistoryDocument } from '@kbn/alerting-plugin/server/rules_client/lib/change_tracking';
import type {
  Page,
  PerPage,
  RuleHistoryResult,
} from '../../../../../../common/api/detection_engine';
import { convertAlertingRuleToRuleResponse } from '../detection_rules_client/converters/convert_alerting_rule_to_rule_response';

export interface GetRuleHistoryOptions {
  client: RulesClient;
  ruleId: string;
  page: Page | undefined;
  perPage: PerPage | undefined;
}

export interface GetRuleHistoryResponse {
  startDate?: Date;
  total: number;
  items: RuleHistoryResult[];
}

export const getRuleHistory = async ({
  client,
  ruleId,
  perPage = 20,
  page = 1,
}: GetRuleHistoryOptions): Promise<GetRuleHistoryResponse> => {
  const history = await client.getHistoryForRule({
    module: 'security',
    ruleId,
    page,
    perPage,
    sort: { '@timestamp': 'desc' },
  });
  return {
    total: history.total,
    items: history.items.map(mapHistoryItem),
  };
};

const mapHistoryItem = (item: RuleChangeHistoryDocument): RuleHistoryResult => {
  const { user, event, object, rule: alertingRule, metadata } = item;
  // TODO: Watch out for extra layer of unwrapping below (RuleDomain -> SanitizedRule).
  const rule = convertAlertingRuleToRuleResponse(alertingRule);
  return {
    timestamp: item['@timestamp'],
    id: event.id,
    ruleId: rule.id,
    username: user?.name,
    revision: rule.revision as number | undefined,
    previousRevision: object.diff?.before?.['attributes.revision'] as number | undefined,
    version: rule.version as number | undefined,
    action: event.action,
    changes: object.diff?.fields ?? [],
    snapshot: object.snapshot,
    rule,
    oldvalues: object.diff?.before,
    metadata,
  };
};
