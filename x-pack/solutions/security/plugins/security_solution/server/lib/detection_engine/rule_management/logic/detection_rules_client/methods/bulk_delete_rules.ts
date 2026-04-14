/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { RulesClient, BulkOperationError } from '@kbn/alerting-plugin/server';
import type { RuleObjectId } from '../../../../../../../common/api/detection_engine';
import type { RuleAlertType } from '../../../../rule_schema';

// The `rulesClient.bulkDeleteRules` method converts IDs into a KQL "OR" query,
// which is limited by Elasticsearch's `max_clause_count` (default 1024). The alerting
// schema enforces a maxSize of 1000 per call to stay within that limit.
const CHUNK_SIZE = 1000;

interface BulkDeleteRulesParams {
  rulesClient: RulesClient;
  ruleIds: RuleObjectId[];
}

export const bulkDeleteRules = async ({
  rulesClient,
  ruleIds,
}: BulkDeleteRulesParams): Promise<{ rules: RuleAlertType[]; errors: BulkOperationError[] }> => {
  const chunks = chunk(ruleIds, CHUNK_SIZE);
  const allRules: RuleAlertType[] = [];
  const allErrors: BulkOperationError[] = [];

  for (const idsChunk of chunks) {
    const { rules, errors } = await rulesClient.bulkDeleteRules({ ids: idsChunk });
    allRules.push(...(rules as RuleAlertType[]));
    allErrors.push(...errors);
  }

  return { rules: allRules, errors: allErrors };
};
