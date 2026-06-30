/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public `PUT /api/synthetics/monitors/_bulk_update` route.
 *
 * Reuses the existing `syncEditedMonitorBulk` orchestrator (in
 * `./edit_monitor_bulk.ts`) for the ES write + Fleet sync.
 */

import { schema } from '@kbn/config-schema';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import { ConfigKey, type MonitorFields } from '../../../../common/runtime_types';
import { UpdateMonitorAPI } from '../services/update_monitor_api';
import type {
  MonitorBulkUpdate,
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
  { updates: MonitorBulkUpdate[] }
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_BULK_UPDATE,
  validate: {},
  validation: {
    request: {
      body: schema.object({
        // `maxSize` matches the `perPage: 500` decrypt page in
        // `monitorConfigRepository.findDecryptedMonitors`, so a single bulk
        // call always fits in one PIT page and an arbitrarily large request
        // can't be used as a DoS amplifier (each entry triggers decrypt +
        // merge + io-ts validation). `maxLength` on `id` blocks the long-
        // string DoS variant CodeQL flagged for the prior `ids` schema.
        updates: schema.arrayOf(
          schema.object({
            id: schema.string({ minLength: 1, maxLength: 1024 }),
            attributes: schema.object({}, { unknowns: 'allow' }),
          }),
          { minSize: 1, maxSize: 500 }
        ),
      }),
    },
  },
  handler: async (routeContext) => {
    const { request, response, server, spaceId } = routeContext;
    const { updates } = request.body || {};

    const requestError = validateUpdates(updates);
    if (requestError) {
      return response.badRequest({ body: { message: requestError } });
    }

    const ids = updates.map((update) => update.id);

    const updateAPI = new UpdateMonitorAPI(routeContext);
    const preprocess = await updateAPI.execute({ updates });

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
 * Request-level validation that the schema can't express:
 *   - each item's `attributes` must contain at least one field to patch
 *   - each `id` may appear at most once (a duplicate would make the applied
 *     patch ambiguous, since each id carries its own attributes)
 * Both are client mistakes (not per-id data conditions), so they fail the
 * whole request with a 400 rather than landing in `result[].error`.
 */
const validateUpdates = (updates: MonitorBulkUpdate[]): string | undefined => {
  const seen = new Set<string>();
  for (const { id, attributes } of updates) {
    if (isEmpty(attributes)) {
      return emptyAttributesMessage(id);
    }
    if (seen.has(id)) {
      return duplicateIdMessage(id);
    }
    seen.add(id);
  }
  return undefined;
};

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

const emptyAttributesMessage = (id: string) =>
  i18n.translate('xpack.synthetics.server.bulkUpdate.emptyAttributes', {
    defaultMessage:
      '`attributes` is required for monitor id {id} and must contain at least one field to update.',
    values: { id },
  });

const duplicateIdMessage = (id: string) =>
  i18n.translate('xpack.synthetics.server.bulkUpdate.duplicateId', {
    defaultMessage: 'Duplicate monitor id {id} in updates; each id may appear at most once.',
    values: { id },
  });
