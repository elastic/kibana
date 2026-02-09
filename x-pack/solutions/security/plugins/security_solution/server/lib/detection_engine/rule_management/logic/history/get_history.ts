/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server/rules_client/rules_client';
import type { ChangeHistoryDocument } from '@kbn/alerting-plugin/server/rules_client/lib/change_tracking';
import { RuleTypeSolutions } from '@kbn/alerting-types';
import type {
  Page,
  PerPage,
  RuleHistoryResult,
} from '../../../../../../common/api/detection_engine';

export interface GetRuleHistoryOptions {
  client: RulesClient;
  ruleId: string;
  page: Page | undefined;
  perPage: PerPage | undefined;
}

export interface GetRuleHistoryResponse {
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

const mapHistoryItem = (item: ChangeHistoryDocument): RuleHistoryResult => {
  const { user, event, object } = item;
  return {
    timestamp: item['@timestamp'],
    userId: user?.id,
    revision: object.snapshot?.revision,
    version: object.snapshot?.version,
    action: event.action,
    changes: object.changes ?? [],
  };
};
