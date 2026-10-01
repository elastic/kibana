/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSavedObjectErrorResult, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { ServiceLocationErrors } from '../../../../common/runtime_types';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { MAX_MONITOR_FANOUT_SIZE } from '../../zod_query';
import {
  InvalidLocationError,
  InvalidScheduleError,
} from '../../../synthetics_service/project_monitor/normalizers/common_fields';
import { InvalidMaintenanceWindowError } from '../../../synthetics_service/maintenance_windows/resolve_maintenance_windows';
import { createMonitorRequestBody } from '../monitor_request_body';
import { MonitorValidationError } from '../monitor_validation';
import { syncNewMonitorBulk } from './add_monitor_bulk';
import type { CreateMonitorPayLoad } from '../add_monitor/add_monitor_api';
import { CreateMonitorBulkAPI } from '../services/create_monitor_bulk_api';

const MAX_BULK_CREATE_REQUEST_BYTES = 100 * 1024 * 1024;

export interface BulkCreateMonitorResultEntry {
  id: string;
  created: boolean;
  error?: string;
}

export interface BulkCreateMonitorResponse {
  result: BulkCreateMonitorResultEntry[];
  errors?: ServiceLocationErrors;
}

/** Public `POST /api/synthetics/monitors/_bulk_create` route. */
export const createSyntheticsMonitorBulkRoute: SyntheticsRestApiRouteFactory<
  BulkCreateMonitorResponse,
  Record<string, string>,
  Record<string, string>,
  { monitors: Array<z.infer<typeof createMonitorRequestBody>> }
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_BULK_CREATE,
  validate: {},
  validation: {
    request: {
      body: z.strictObject({
        monitors: z.array(createMonitorRequestBody).min(1).max(MAX_MONITOR_FANOUT_SIZE),
      }),
    },
  },
  options: {
    body: {
      maxBytes: MAX_BULK_CREATE_REQUEST_BYTES,
    },
  },
  handler: async (routeContext) => {
    const { request, response, spaceId } = routeContext;

    try {
      const createMonitorBulkAPI = new CreateMonitorBulkAPI(routeContext);
      const preparedMonitors = await createMonitorBulkAPI.prepare(
        request.body.monitors as CreateMonitorPayLoad[]
      );
      const createAccessError = await createMonitorBulkAPI.validateCreateAccess(preparedMonitors);
      if (createAccessError) {
        return createAccessError;
      }

      const { normalizedMonitors, privateLocations, maintenanceWindows } = preparedMonitors;

      const {
        newMonitors = [],
        failedMonitors,
        errors,
      } = await syncNewMonitorBulk({
        routeContext,
        normalizedMonitors,
        privateLocations,
        maintenanceWindows,
        spaceId,
      });

      const result = newMonitors.map<BulkCreateMonitorResultEntry>((monitor) => {
        if (isSavedObjectErrorResult(monitor)) {
          return {
            id: monitor.id,
            created: false,
            error: monitor.error.message,
          };
        }
        return { id: monitor.id, created: true };
      });
      result.push(
        ...failedMonitors.map(({ monitor, error }) => ({
          id: monitor.id,
          created: false,
          error:
            error instanceof Error ? error.message : 'Failed to sync monitor to private location',
        }))
      );

      return errors && errors.length > 0 ? { result, errors } : { result };
    } catch (error) {
      if (error instanceof MonitorValidationError) {
        return response.badRequest({
          body: {
            message: error.result.reason,
            attributes: { details: error.result.details },
          },
        });
      }
      if (
        error instanceof InvalidLocationError ||
        error instanceof InvalidScheduleError ||
        error instanceof InvalidMaintenanceWindowError
      ) {
        return response.badRequest({ body: { message: error.message } });
      }
      if (SavedObjectsErrorHelpers.isForbiddenError(error)) {
        return response.forbidden({ body: error });
      }

      routeContext.server.logger.error('Unable to bulk create synthetics monitors', { error });
      return response.customError({
        statusCode: 500,
        body: { message: error.message },
      });
    }
  },
});
