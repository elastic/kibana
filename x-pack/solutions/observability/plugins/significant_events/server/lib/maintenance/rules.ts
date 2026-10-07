/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_ITEMS } from '@kbn/alerting-v2-schemas';
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
export const toRulesToggleResult = (
  ids: string[],
  { errors }: Awaited<ReturnType<RulesClientApi['bulkDisableRules']>>
): RulesToggleResult => {
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

type BulkDisableResponse = Awaited<ReturnType<RulesClientApi['bulkDisableRules']>>;

/**
 * Disable rules in batches the internal rules client accepts. One failing
 * batch does not stop the rest.
 */
export const disableRulesInBatches = async (
  ids: string[],
  disable: (ids: string[]) => Promise<BulkDisableResponse>
): Promise<RulesToggleResult> => {
  const toggledIds: string[] = [];
  const failedIds: string[] = [];
  const failures: SignificantEventsMaintenanceFailure[] = [];
  for (let offset = 0; offset < ids.length; offset += MAX_BULK_ITEMS) {
    const chunk = ids.slice(offset, offset + MAX_BULK_ITEMS);
    try {
      const result = toRulesToggleResult(chunk, await disable(chunk));
      toggledIds.push(...result.toggledIds);
      failedIds.push(...result.failedIds);
      failures.push(...result.failures);
    } catch (error) {
      const message = toMessage(error);
      failedIds.push(...chunk);
      failures.push(...chunk.map((id) => ({ target: `rule:${id}`, error: message })));
    }
  }
  return { toggledIds, failedIds, failures };
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

const RULE_BULK_SIZE = 100;

export const deleteV2Rules = async (
  rulesClient: RulesClientApi,
  ids: string[]
): Promise<{
  deleted: number;
  failedIds: string[];
  failures: SignificantEventsMaintenanceFailure[];
}> => {
  let deleted = 0;
  const failedIds: string[] = [];
  const failures: SignificantEventsMaintenanceFailure[] = [];
  for (let offset = 0; offset < ids.length; offset += RULE_BULK_SIZE) {
    const chunk = ids.slice(offset, offset + RULE_BULK_SIZE);
    try {
      const result = await rulesClient.bulkDeleteRules({ ids: chunk });
      deleted += result.affected_count;
      for (const error of result.errors) {
        if (error.error.code !== ALERTING_ERROR_CODES.RULE_NOT_FOUND) {
          failedIds.push(error.id);
          failures.push({ target: `rule:${error.id}`, error: error.error.message });
        }
      }
    } catch (error) {
      const message = toMessage(error);
      failedIds.push(...chunk);
      failures.push(...chunk.map((id) => ({ target: `rule:${id}`, error: message })));
    }
  }
  return { deleted, failedIds, failures };
};
