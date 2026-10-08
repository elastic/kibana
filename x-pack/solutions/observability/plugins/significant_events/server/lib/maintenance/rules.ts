/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_ITEMS, type BulkResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import { toMessage } from './to_message';

export interface RulesToggleResult {
  toggledIds: string[];
  failedIds: string[];
  failures: SignificantEventsMaintenanceFailure[];
}

/**
 * Classify an alerting v2 bulk toggle response. Returns the ids that were
 * actually toggled (no error), the ids that failed for a non-not-found reason,
 * and one failure entry per fatal id. A missing rule is treated as "already
 * gone" and reported as neither toggled nor failed.
 */
export const toRulesToggleResult = (ids: string[], { errors }: BulkResponse): RulesToggleResult => {
  const fatalErrors = errors.filter(
    (error) => error.error.code !== ALERTING_ERROR_CODES.RULE_NOT_FOUND
  );
  const erroredIds = new Set(errors.map((error) => error.id));
  return {
    toggledIds: ids.filter((id) => !erroredIds.has(id)),
    failedIds: fatalErrors.map((error) => error.id),
    failures: fatalErrors.map((error) => ({
      target: `rule:${error.id}`,
      error: error.error.message,
    })),
  };
};

/**
 * Run a bulk rule operation in batches of `MAX_BULK_ITEMS`. A failing batch
 * fails each of its ids without stopping the rest.
 */
export const runRulesInBatches = async (
  ids: string[],
  run: (chunk: string[]) => Promise<BulkResponse>
): Promise<RulesToggleResult & { affectedCount: number }> => {
  let affectedCount = 0;
  const toggledIds: string[] = [];
  const failedIds: string[] = [];
  const failures: SignificantEventsMaintenanceFailure[] = [];
  for (let offset = 0; offset < ids.length; offset += MAX_BULK_ITEMS) {
    const chunk = ids.slice(offset, offset + MAX_BULK_ITEMS);
    try {
      const response = await run(chunk);
      const result = toRulesToggleResult(chunk, response);
      affectedCount += response.affected_count;
      toggledIds.push(...result.toggledIds);
      failedIds.push(...result.failedIds);
      failures.push(...result.failures);
    } catch (error) {
      const message = toMessage(error);
      failedIds.push(...chunk);
      failures.push(...chunk.map((id) => ({ target: `rule:${id}`, error: message })));
    }
  }
  return { affectedCount, toggledIds, failedIds, failures };
};

/** Toggle `enabled` on a set of alerting v2 signal rules as the caller. */
export const setV2RulesEnabled = async (
  rulesClient: RulesClientApi,
  ids: string[],
  enabled: boolean
): Promise<RulesToggleResult> =>
  toRulesToggleResult(
    ids,
    enabled
      ? await rulesClient.bulkEnableRules({ ids })
      : await rulesClient.bulkDisableRules({ ids })
  );

export const deleteV2Rules = async (
  rulesClient: RulesClientApi,
  ids: string[]
): Promise<{
  deleted: number;
  failedIds: string[];
  failures: SignificantEventsMaintenanceFailure[];
}> => {
  const { affectedCount, failedIds, failures } = await runRulesInBatches(ids, (chunk) =>
    rulesClient.bulkDeleteRules({ ids: chunk })
  );
  return { deleted: affectedCount, failedIds, failures };
};
