/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
import { AddEditMonitorAPI, CreateMonitorPayLoad } from './add_monitor/add_monitor_api';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { normalizeAPIConfig, validateMonitor } from './monitor_validation';
import { mapSavedObjectToMonitor } from './formatters/saved_object_to_monitor';

export const addSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
  validate: {},
  validation: {
    request: {
      body: schema.any(),
      query: schema.object({
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
      }),
    },
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response, server, spaceId } = routeContext;
    // usually id is auto generated, but this is useful for testing
    const { id, internal, savedObjectType } = request.query;

    const addMonitorAPI = new AddEditMonitorAPI(routeContext);

    const {
      locations,
      private_locations: privateLocations,
      ...monitor
    } = request.body as CreateMonitorPayLoad;

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

      const monitorWithDefaults = await addMonitorAPI.normalizeMonitor(
        formattedConfig!,
        request.body as CreateMonitorPayLoad
      );

      const validationResult = validateMonitor(monitorWithDefaults, spaceId);

      if (!validationResult.valid || !validationResult.decodedMonitor) {
        const { reason: message, details } = validationResult;
        return response.badRequest({
          body: { message, attributes: { details, payload: monitor } },
        });
      }

      const normalizedMonitor = validationResult.decodedMonitor;

      // Parallelize permission and unique name validation
      const [err, nameError] = await Promise.all([
        validatePermissions(routeContext, normalizedMonitor.locations),
        addMonitorAPI.validateUniqueMonitorName(normalizedMonitor.name),
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

      return mapSavedObjectToMonitor({ monitor: newMonitor, internal });
    } catch (error) {
      if (error instanceof InvalidLocationError || error instanceof InvalidScheduleError) {
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

export const invalidOriginError = (origin: string) => {
  return i18n.translate('xpack.synthetics.server.projectMonitors.invalidPublicOriginError', {
    defaultMessage: 'Unsupported origin type {origin}, only ui type is supported via API.',
    values: {
      origin,
    },
  });
};
