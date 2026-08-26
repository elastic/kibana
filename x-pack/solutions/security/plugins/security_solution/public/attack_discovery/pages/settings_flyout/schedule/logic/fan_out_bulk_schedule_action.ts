/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionAttackDiscoverySchedulesResponse } from '@kbn/elastic-assistant-common';

interface FanOutBulkScheduleActionParams {
  /** The per-id internal endpoint call (e.g. enable/disable/delete). */
  action: (id: string) => Promise<unknown>;
  ids: string[];
}

/**
 * Fans a bulk schedule action out to a per-id internal endpoint and aggregates
 * the outcomes into the same `BulkActionAttackDiscoverySchedulesResponse` shape
 * the public bulk API returns. This mirrors the shared data client's own bulk
 * loop (`bulkEnableSchedules`/`bulkDisableSchedules`/`bulkDeleteSchedules`): a
 * single id that fails (e.g. not visible to the caller) surfaces as a per-id
 * error rather than failing the whole action.
 */
export const fanOutBulkScheduleAction = async ({
  action,
  ids,
}: FanOutBulkScheduleActionParams): Promise<BulkActionAttackDiscoverySchedulesResponse> => {
  const results = await Promise.all(
    ids.map((id) =>
      action(id).then(
        () => ({ id, ok: true as const }),
        (err: unknown) => ({
          id,
          message: err instanceof Error ? err.message : String(err),
          ok: false as const,
        })
      )
    )
  );

  const succeeded = results.filter((result): result is { id: string; ok: true } => result.ok);
  const failed = results.filter(
    (result): result is { id: string; message: string; ok: false } => !result.ok
  );

  return {
    errors: failed.map(({ id, message }) => ({ message, rule: { id, name: id } })),
    ids: succeeded.map(({ id }) => id),
    total: ids.length,
  };
};
