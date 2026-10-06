/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import { toMessage } from './to_message';

/**
 * Toggle `enabled` on a set of alerting v2 signal rules. Returns the
 * ids that were actually toggled (no error), the ids that failed for a non-not-found
 * reason, and one failure entry per fatal id. A missing rule is treated as
 * "already gone" and reported as neither toggled nor failed.
 */
export const setV2RulesEnabled = async (
  rulesClient: RulesClientApi,
  ids: string[],
  enabled: boolean
): Promise<{
  toggledIds: string[];
  failedIds: string[];
  failures: SignificantEventsMaintenanceFailure[];
}> => {
  const { errors } = enabled
    ? await rulesClient.bulkEnableRules({ ids })
    : await rulesClient.bulkDisableRules({ ids });
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
