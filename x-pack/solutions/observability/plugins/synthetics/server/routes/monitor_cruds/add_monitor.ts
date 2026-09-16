/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
} from '../../../common/types/saved_objects';
import { validatePermissions } from './edit_monitor';
import {
  InvalidLocationError,
  InvalidScheduleError,
} from '../../synthetics_service/project_monitor/normalizers/common_fields';
import { InvalidMaintenanceWindowError } from '../../synthetics_service/maintenance_windows/resolve_maintenance_windows';
import type { CreateMonitorPayLoad } from './add_monitor/add_monitor_api';
import { AddEditMonitorAPI } from './add_monitor/add_monitor_api';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { ConfigKey } from '../../../common/runtime_types';
import type { MonitorFields } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { normalizeAPIConfig, validateMonitor } from './monitor_validation';
import { mapSavedObjectToMonitor } from './formatters/saved_object_to_monitor';
import { getBrowserTimeoutWarningForMonitor } from './monitor_warnings';
import {
  assertCanPerformMonitorBulkActionInAllSpaces,
  validateMonitorPrivateLocationSpaces,
} from './monitor_locations_utils';
import type { MonitorConfigRepository } from '../../services/monitor_config_repository';

const CreateMonitorQueryParamsSchema = schema.object({
  id: schema.maybe(schema.string()),
  preserve_namespace: schema.maybe(schema.boolean()),
  gettingStarted: schema.maybe(schema.boolean()),
  internal: schema.maybe(
    schema.boolean({
      defaultValue: false,
    })
  ),
  // primarily used for testing purposes, to specify the type of saved object
  savedObjectType: schema.maybe(
    schema.oneOf(
      [
        schema.literal(syntheticsMonitorSavedObjectType),
        schema.literal(legacySyntheticsMonitorTypeSingle),
      ],
      {
        defaultValue: syntheticsMonitorSavedObjectType,
      }
    )
  ),
});

export type CreateMonitorQueryParams = TypeOf<typeof CreateMonitorQueryParamsSchema>;

export const addSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
  validate: {},
  validation: {
    request: {
      body: schema.any(),
      query: CreateMonitorQueryParamsSchema,
    },
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response, server, spaceId, monitorConfigRepository } = routeContext;
    // usually id is auto generated, but this is useful for testing
    const { id: queryId, internal, savedObjectType } = request.query;

    const addMonitorAPI = new AddEditMonitorAPI(routeContext);

    const {
      locations,
      private_locations: privateLocations,
      ...monitor
    } = request.body as CreateMonitorPayLoad;

    // A caller can specify the monitor id directly in the body; the query param is
    // kept for backwards compatibility. Either way, a colliding id must not silently
    // overwrite an existing monitor (`syncNewMonitor` otherwise upserts by id).
    const id = (request.body as CreateMonitorPayLoad & { id?: string }).id || queryId;

    if (request.body.origin && request.body.origin !== 'ui') {
      return response.badRequest({
        body: {
          message: invalidOriginError(request.body.origin),
          attributes: {
            details: invalidOriginError(request.body.origin),
            payload: request.body,
          },
        },
      });
    }

    try {
      const { errorMessage: unsupportedKeysErrors, formattedConfig } = normalizeAPIConfig(
        request.body as CreateMonitorPayLoad
      );
      if (unsupportedKeysErrors) {
        return response.badRequest({
          body: {
            message: unsupportedKeysErrors,
            attributes: { details: unsupportedKeysErrors },
          },
        });
      }

      const maintenanceWindowRefs = formattedConfig?.[ConfigKey.MAINTENANCE_WINDOWS];
      const maintenanceWindows = maintenanceWindowRefs?.length
        ? (await routeContext.syntheticsMonitorClient.syntheticsService.getMaintenanceWindows(
            spaceId
          )) ?? []
        : [];

      const monitorWithDefaults = await addMonitorAPI.normalizeMonitor(
        formattedConfig!,
        request.body as CreateMonitorPayLoad,
        undefined,
        maintenanceWindows
      );

      const validationResult = validateMonitor(
        monitorWithDefaults,
        spaceId,
        server.cloud?.isServerlessEnabled
      );

      if (!validationResult.valid || !validationResult.decodedMonitor) {
        const { reason: message, details } = validationResult;
        return response.badRequest({
          body: { message, attributes: { details, payload: monitor } },
        });
      }

      const normalizedMonitor = validationResult.decodedMonitor;

      // Parallelize permission, unique name, and (when a custom id was supplied) id
      // collision validation
      const [err, nameError, idConflictError] = await Promise.all([
        validatePermissions(routeContext, normalizedMonitor.locations),
        addMonitorAPI.validateUniqueMonitorName(normalizedMonitor.name),
        id ? monitorIdConflictError(monitorConfigRepository, id) : undefined,
      ]);

      if (err) {
        return response.forbidden({
          body: {
            message: err,
          },
        });
      }
      if (nameError) {
        return response.badRequest({
          body: { message: nameError, attributes: { details: nameError } },
        });
      }
      if (idConflictError) {
        return response.conflict({
          body: { message: idConflictError, attributes: { details: idConflictError } },
        });
      }

      const monitorSpaces = normalizedMonitor[ConfigKey.KIBANA_SPACES] ?? [];
      if (monitorSpaces.length > 0) {
        const spaceAuthError = await assertCanPerformMonitorBulkActionInAllSpaces(
          routeContext,
          monitorSpaces
        );
        if (spaceAuthError) {
          return spaceAuthError;
        }
      }

      if (addMonitorAPI.allPrivateLocations && addMonitorAPI.allPrivateLocations.length > 0) {
        const plSpaceError = validateMonitorPrivateLocationSpaces(
          normalizedMonitor as MonitorFields,
          addMonitorAPI.allPrivateLocations
        );
        if (plSpaceError) {
          return response.badRequest({
            body: {
              message: plSpaceError.message,
              attributes: plSpaceError.attributes,
            },
          });
        }
      }

      const { errors, newMonitor } = await addMonitorAPI.syncNewMonitor({
        id,
        normalizedMonitor,
        savedObjectType,
      });

      if (errors && errors.length > 0) {
        return {
          message: 'error pushing monitor to the service',
          attributes: { errors },
          id: newMonitor.id,
        };
      }
      addMonitorAPI.initDefaultAlerts(newMonitor.attributes.name);
      addMonitorAPI.setupGettingStarted(newMonitor.id);

      const warning = getBrowserTimeoutWarningForMonitor(normalizedMonitor, newMonitor.id);
      const monitorResponse = mapSavedObjectToMonitor({ monitor: newMonitor, internal });
      return warning ? { ...monitorResponse, warnings: [warning] } : monitorResponse;
    } catch (error) {
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

      server.logger.error('Unable to create synthetics monitor', { error });
      return response.customError({
        body: { message: error.message },
        statusCode: 500,
      });
    }
  },
});

const monitorIdConflictError = async (
  monitorConfigRepository: MonitorConfigRepository,
  id: string
): Promise<string | undefined> => {
  try {
    await monitorConfigRepository.get(id);
    return i18n.translate('xpack.synthetics.createMonitor.validation.idConflict', {
      defaultMessage: 'Monitor with id "{id}" already exists.',
      values: { id },
    });
  } catch (e) {
    return undefined;
  }
};

export const invalidOriginError = (origin: string) => {
  return i18n.translate('xpack.synthetics.server.projectMonitors.invalidPublicOriginError', {
    defaultMessage: 'Unsupported origin type {origin}, only ui type is supported via API.',
    values: {
      origin,
    },
  });
};
