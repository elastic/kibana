/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_ITEMS, type BulkResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';

export interface BulkRuleResult {
  affectedCount: number;
  succeededIds: string[];
  failures: Array<{ id: string; message: string }>;
}

/** Classify a bulk response, treating missing rules as already gone rather than successful writes. */
export const toBulkRuleResult = (
  ids: string[],
  { affected_count: affectedCount, errors }: BulkResponse
): BulkRuleResult => {
  const erroredIds = new Set(errors.map(({ id }) => id));
  return {
    affectedCount,
    succeededIds: ids.filter((id) => !erroredIds.has(id)),
    failures: errors
      .filter(({ error }) => error.code !== ALERTING_ERROR_CODES.RULE_NOT_FOUND)
      .map(({ id, error }) => ({ id, message: error.message })),
  };
};

/** Run supported-size batches, preserving per-rule failures and continuing after rejected requests. */
export const runBulkRuleOperation = async (
  ids: string[],
  run: (chunk: string[]) => Promise<BulkResponse>
): Promise<BulkRuleResult> => {
  const result: BulkRuleResult = { affectedCount: 0, succeededIds: [], failures: [] };
  for (let offset = 0; offset < ids.length; offset += MAX_BULK_ITEMS) {
    const chunk = ids.slice(offset, offset + MAX_BULK_ITEMS);
    try {
      const batch = toBulkRuleResult(chunk, await run(chunk));
      result.affectedCount += batch.affectedCount;
      result.succeededIds.push(...batch.succeededIds);
      result.failures.push(...batch.failures);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failures.push(...chunk.map((id) => ({ id, message })));
    }
  }
  return result;
};

const ROTATE_RETRIES = 1;

/**
 * Re-key rules, retrying once the rules whose task flipped to running between two reads. Every
 * other failure from any attempt is kept, so a retry that succeeds cannot hide a permanent one.
 */
export const bulkUpdateApiKeyWithRetry = async (
  rulesClient: Pick<RulesClientApi, 'bulkUpdateApiKey'>,
  ids: string[]
): Promise<BulkResponse> => {
  let pending = ids;
  let affectedCount = 0;
  const errors: BulkResponse['errors'] = [];
  for (let attempt = 0; attempt <= ROTATE_RETRIES && pending.length > 0; attempt++) {
    const response = await rulesClient.bulkUpdateApiKey({ ids: pending });
    const isBusy = ({ error }: BulkResponse['errors'][number]) =>
      error.code === ALERTING_ERROR_CODES.RULE_ALREADY_RUNNING;
    const lastAttempt = attempt === ROTATE_RETRIES;
    affectedCount += response.affected_count;
    errors.push(...response.errors.filter((e) => lastAttempt || !isBusy(e)));
    pending = response.errors.filter(isBusy).map(({ id }) => id);
  }
  return { affected_count: affectedCount, errors };
};

/** Delete rules through the supplied scoped client, retaining counts and individual failures. */
export const deleteRules = (
  rulesClient: Pick<RulesClientApi, 'bulkDeleteRules'>,
  ids: string[]
): Promise<BulkRuleResult> =>
  runBulkRuleOperation(ids, (chunk) => rulesClient.bulkDeleteRules({ ids: chunk }));
