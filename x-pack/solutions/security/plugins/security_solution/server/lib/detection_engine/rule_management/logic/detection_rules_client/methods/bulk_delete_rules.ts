/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { RulesClient, BulkOperationError } from '@kbn/alerting-plugin/server';
import type { BulkDeleteActionSkipResult } from '@kbn/alerting-plugin/common';
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

interface BulkDeleteRulesResult {
  rules: RuleAlertType[];
  errors: BulkOperationError[];
  skipped: BulkDeleteActionSkipResult[];
}

export const bulkDeleteRules = async ({
  rulesClient,
  rules,
  changeTracking,
}: BulkDeleteRulesParams): Promise<BulkDeleteRulesResult> => {
  const ruleIds = rules.map((rule) => rule.id);
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  const chunks = chunk(ruleIds, CHUNK_SIZE);
  const allRules: RuleAlertType[] = [];
  const allErrors: BulkOperationError[] = [];
  const allSkipped: BulkDeleteActionSkipResult[] = [];

  for (const idsChunk of chunks) {
    const result = await rulesClient.bulkDeleteRules({
      ids: idsChunk,
      changeTracking: { metadata: { bulkCount: ruleIds.length, ...changeTracking?.metadata } },
    });
    allRules.push(...(result.rules as RuleAlertType[]));

    for (const error of result.errors) {
      if (error.status === 404 && rulesById.has(error.rule.id)) {
        allSkipped.push({
          id: error.rule.id,
          name: error.rule.name,
          skip_reason: 'RULE_NOT_FOUND',
        });
        continue;
      }
      allErrors.push(error);
    }

    // Rules that silently drop out of alerting's PIT search (deleted between
    // our fetch and the PIT query) appear in neither rules nor errors.
    const returnedIds = new Set([
      ...result.rules.map((r) => r.id),
      ...result.errors.map((e) => e.rule.id),
    ]);
    for (const id of idsChunk) {
      if (!returnedIds.has(id)) {
        allSkipped.push({
          id,
          name: rulesById.get(id)?.name,
          skip_reason: 'RULE_NOT_FOUND',
        });
      }
    }
  }

  return { rules: allRules, errors: allErrors, skipped: allSkipped };
};
