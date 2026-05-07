/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bulk PATCH endpoint for Synthetics monitors.
 *
 * Named `update_monitor_bulk` to mirror the URL path word `_bulk_update`,
 * matching the file→path convention used by `delete_monitor_bulk.ts` /
 * `reset_monitor_bulk.ts`. The plugin's internal vocabulary uses `edit`
 * (e.g. `editSyntheticsMonitorRoute`, `syncEditedMonitorBulk`); we keep
 * `update` here to (a) match the URL path and (b) avoid colliding with
 * `bulk_cruds/edit_monitor_bulk.ts`, which is the helper module that exports
 * `syncEditedMonitorBulk` (the orchestrator this route reuses).
 *
 * Pipeline (see kibana-34 v3 diagram):
 *   1. `UpdateMonitorAPI.execute` — decrypt, merge, re-encrypt; produces
 *      `MonitorConfigUpdate` survivors and per-id pre-errors.
 *   2. If any survivors, fetch private locations covering every namespace
 *      involved in the patch, then call `syncEditedMonitorBulk` to write
 *      to ES + sync Fleet/Synthetics service in one shot.
 *   3. Merge per-id pre-errors with rolled-back-on-Fleet-failure ids and
 *      with successful SO write ids into one ordered `result` array. Top-
 *      level `errors` carries service-level (not per-id) sync failures.
 */

import { schema } from '@kbn/config-schema';
import { isEmpty } from 'lodash';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import { ConfigKey, type MonitorFields } from '../../../../common/runtime_types';
import { UpdateMonitorAPI } from '../services/update_monitor_api';
import type {
  UpdateMonitorPerIdError,
  UpdateMonitorPreprocessResult,
} from '../services/update_monitor_api';
import { syncEditedMonitorBulk } from './edit_monitor_bulk';
import { getPrivateLocationsForNamespaces } from '../../../synthetics_service/get_private_locations';

export interface UpdateMonitorBulkResultEntry {
  id: string;
  updated: boolean;
  error?: string;
}

export interface UpdateMonitorBulkResponse {
  result: UpdateMonitorBulkResultEntry[];
  errors?: unknown[];
}

export const updateSyntheticsMonitorBulkRoute: SyntheticsRestApiRouteFactory<
  UpdateMonitorBulkResponse,
  Record<string, string>,
  Record<string, string>,
  { ids: string[]; attributes: Record<string, unknown> }
> = () => ({
  method: 'PATCH',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_BULK_UPDATE,
  validate: {},
  validation: {
    request: {
      body: schema.object({
        ids: schema.arrayOf(schema.string(), { minSize: 1 }),
        attributes: schema.object({}, { unknowns: 'allow' }),
      }),
    },
  },
  handler: async (routeContext) => {
    const { request, response, server, spaceId } = routeContext;
    const { ids, attributes } = request.body || {};

    if (isEmpty(attributes)) {
      return response.badRequest({
        body: {
          message: '`attributes` is required and must contain at least one field to patch.',
        },
      });
    }

    const updateAPI = new UpdateMonitorAPI(routeContext);
    const preprocess = await updateAPI.execute({ ids, attributes });

    if (preprocess.survivors.length === 0) {
      /*
       * Every requested id failed pre-processing. Skip the sync call and
       * its private-location fetch entirely — there is nothing to write.
       */
      return response.ok({
        body: buildResponseBody(ids, preprocess),
      });
    }

    try {
      const privateLocations = await loadPrivateLocationsForSurvivors(routeContext, preprocess);
      const sync = await syncEditedMonitorBulk({
        routeContext,
        spaceId,
        monitorsToUpdate: preprocess.survivors,
        privateLocations,
      });

      return response.ok({
        body: buildResponseBody(ids, preprocess, sync),
      });
    } catch (error) {
      /*
       * `syncEditedMonitorBulk` already attempted a complete rollback before
       * rethrowing, so the SO state is back to pre-call. Surface a 500 with
       * the original message — this is a true server error, not a per-id
       * failure (those are reported in `result[].error`).
       */
      server.logger.error(`Bulk update failed during sync: ${error.message}`, { error });
      return response.customError({
        statusCode: 500,
        body: { message: error.message },
      });
    }
  },
});

/**
 * Compute the namespace set the sync needs to cover: the request space
 * plus every space any survivor monitor is shared to. Mirrors the
 * single-PUT flow at `edit_monitor.ts` (post-merge spaces, not pre).
 */
const loadPrivateLocationsForSurvivors = async (
  routeContext: RouteContext,
  preprocess: UpdateMonitorPreprocessResult
) => {
  const { server, spaceId } = routeContext;
  const namespaces = new Set<string>([spaceId]);
  for (const { normalizedMonitor } of preprocess.survivors) {
    const spaces = (normalizedMonitor as MonitorFields)[ConfigKey.KIBANA_SPACES] ?? [];
    for (const s of spaces) {
      if (s) namespaces.add(s);
    }
  }
  const internalClient = server.coreStart.savedObjects.createInternalRepository();
  return getPrivateLocationsForNamespaces(internalClient, [...namespaces]);
};

const buildResponseBody = (
  requestedIds: string[],
  preprocess: UpdateMonitorPreprocessResult,
  sync?: Awaited<ReturnType<typeof syncEditedMonitorBulk>>
): UpdateMonitorBulkResponse => {
  const result: UpdateMonitorBulkResultEntry[] = requestedIds.map((id) =>
    classifyId(id, preprocess.perIdErrors[id], sync)
  );
  const errors = sync?.errors && sync.errors.length > 0 ? sync.errors : undefined;
  return errors !== undefined ? { result, errors } : { result };
};

const classifyId = (
  id: string,
  preError: UpdateMonitorPerIdError | undefined,
  sync: Awaited<ReturnType<typeof syncEditedMonitorBulk>> | undefined
): UpdateMonitorBulkResultEntry => {
  if (preError) {
    return { id, updated: false, error: preError.message };
  }

  /*
   * `failedConfigs` only contains entries where `syncEditedMonitorBulk`
   * already rolled the SO back to its previous attributes, so `updated`
   * is correctly `false` for these.
   */
  const fleetFailure = sync?.failedConfigs?.[id];
  if (fleetFailure) {
    return {
      id,
      updated: false,
      error:
        extractErrorMessage(fleetFailure.error) ?? 'Failed to sync monitor to private location',
    };
  }

  const editedMonitorSO = sync?.editedMonitors?.find((m) => m.id === id);
  if (editedMonitorSO?.error) {
    return { id, updated: false, error: editedMonitorSO.error.message };
  }
  if (editedMonitorSO) {
    return { id, updated: true };
  }

  /*
   * Survivor that does not appear in either bucket: should be unreachable,
   * but keep the response shape predictable rather than silently dropping
   * the id from the result array.
   */
  return { id, updated: false, error: 'Monitor was not processed' };
};

const extractErrorMessage = (err: Error | SavedObjectError | undefined): string | undefined => {
  if (!err) return undefined;
  if (typeof (err as Error).message === 'string') return (err as Error).message;
  return undefined;
};
