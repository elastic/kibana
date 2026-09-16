/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { RulesClient, BulkOperationError } from '@kbn/alerting-plugin/server';
import type { SecurityRuleChangeTracking } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleAlertType } from '../../../../rule_schema';

// The `rulesClient.bulkDeleteRules` method converts IDs into a KQL "OR" query,
// which is limited by Elasticsearch's `max_clause_count` (default 1024). The alerting
// schema enforces a maxSize of 1000 per call to stay within that limit.
const CHUNK_SIZE = 1000;

interface BulkDeleteRulesParams {
  rulesClient: RulesClient;
  rules: RuleAlertType[];
  changeTracking?: SecurityRuleChangeTracking<never>;
}

export const bulkDeleteRules = async ({
  rulesClient,
  rules,
  changeTracking,
}: BulkDeleteRulesParams): Promise<{ rules: RuleAlertType[]; errors: BulkOperationError[] }> => {
  const ruleIds = rules.map((rule) => rule.id);
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  const chunks = chunk(ruleIds, CHUNK_SIZE);
  const allRules: RuleAlertType[] = [];
  const allErrors: BulkOperationError[] = [];

  for (const idsChunk of chunks) {
    const result = await rulesClient.bulkDeleteRules({
      ids: idsChunk,
      changeTracking: { metadata: { bulkCount: ruleIds.length, ...changeTracking?.metadata } },
    });
    allRules.push(...(result.rules as RuleAlertType[]));

    // A 404 on delete means the rule was already gone (e.g. concurrent bulk
    // delete). The desired end state is reached, so count it as deleted.
    for (const error of result.errors) {
      if (error.status === 404) {
        const alreadyDeleted = rulesById.get(error.rule.id);
        if (alreadyDeleted) {
          allRules.push(alreadyDeleted);
          continue;
        }
      }
      allErrors.push(error);
    }
  }

  return { rules: allRules, errors: allErrors };
};
