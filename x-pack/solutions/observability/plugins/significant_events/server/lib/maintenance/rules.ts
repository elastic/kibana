/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@kbn/alerting-v2-schemas';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import {
  deleteRules,
  runBulkRuleOperation,
  toBulkRuleResult,
  type BulkRuleResult,
} from '../significant_events/rules/bulk_rule_operations';

export interface RulesToggleResult {
  toggledIds: string[];
  failedIds: string[];
  failures: SignificantEventsMaintenanceFailure[];
}

const toMaintenanceResult = ({ succeededIds, failures }: BulkRuleResult): RulesToggleResult => ({
  toggledIds: succeededIds,
  failedIds: failures.map(({ id }) => id),
  failures: failures.map(({ id, message }) => ({ target: `rule:${id}`, error: message })),
});

/** Report successful toggles and fatal failures, ignoring rules that are already gone. */
export const toRulesToggleResult = (ids: string[], response: BulkResponse): RulesToggleResult =>
  toMaintenanceResult(toBulkRuleResult(ids, response));

/** Run a batched rule operation and adapt its results to maintenance's recovery inventory. */
export const runRulesInBatches = async (
  ids: string[],
  run: (chunk: string[]) => Promise<BulkResponse>
): Promise<RulesToggleResult & { affectedCount: number }> => {
  const result = await runBulkRuleOperation(ids, run);
  return { affectedCount: result.affectedCount, ...toMaintenanceResult(result) };
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
  rulesClient: Pick<RulesClientApi, 'bulkDeleteRules'>,
  ids: string[]
): Promise<{
  deleted: number;
  failedIds: string[];
  failures: SignificantEventsMaintenanceFailure[];
}> => {
  const result = await deleteRules(rulesClient, ids);
  const { failedIds, failures } = toMaintenanceResult(result);
  return { deleted: result.affectedCount, failedIds, failures };
};
