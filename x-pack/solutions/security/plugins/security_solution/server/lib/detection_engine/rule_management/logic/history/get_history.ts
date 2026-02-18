/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server/rules_client/rules_client';
import type { SanitizedRule } from '@kbn/alerting-types';
import { RuleTypeSolutions } from '@kbn/alerting-types';
import type { RuleChangeHistoryDocument } from '@kbn/alerting-plugin/server/rules_client/lib/change_tracking';
import type {
  Page,
  PerPage,
  RuleHistoryResult,
} from '../../../../../../common/api/detection_engine';
import { convertAlertingRuleToRuleResponse } from '../detection_rules_client/converters/convert_alerting_rule_to_rule_response';
import type { RuleParams } from '../../../rule_schema';

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
    module: RuleTypeSolutions.security,
    ruleId,
    page,
    perPage,
    sort: { '@timestamp': 'desc' },
  });
  return {
    startDate: history.startDate,
    total: history.total,
    items: history.items.map(mapHistoryItem),
  };
};

const mapHistoryItem = (item: RuleChangeHistoryDocument): RuleHistoryResult => {
  const { user, event, object, ruleDomain, metadata } = item;
  // TODO: Watch out for extra layer of unwrapping below (RuleDomain -> SanitizedRule).
  const ruleResponse = convertAlertingRuleToRuleResponse(ruleDomain as SanitizedRule<RuleParams>);
  return {
    id: event.id,
    timestamp: item['@timestamp'],
    userId: user?.id,
    revision: ruleDomain?.revision as number | undefined,
    previousRevision: object.oldvalues?.['attributes.revision'] as number | undefined,
    version: ruleResponse.version as number | undefined,
    action: event.action,
    changes: object.changes ?? [],
    snapshot: object.snapshot,
    ruleResponse,
    oldvalues: object.oldvalues,
    metadata,
  };
};
