/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsUpdateResponse, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import { syntheticsMonitorSavedObjectType } from '../../../common/types/saved_objects';
import { invalidOriginError } from './add_monitor';
import {
  InvalidLocationError,
  InvalidScheduleError,
} from '../../synthetics_service/project_monitor/normalizers/common_fields';
import { AddEditMonitorAPI, CreateMonitorPayLoad } from './add_monitor/add_monitor_api';
import { ELASTIC_MANAGED_LOCATIONS_DISABLED } from './project_monitor/add_monitor_project';
import { getPrivateLocations } from '../../synthetics_service/get_private_locations';
import { mergeSourceMonitor } from './formatters/saved_object_to_monitor';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../types';
import {
  MonitorFields,
  EncryptedSyntheticsMonitorAttributes,
  SyntheticsMonitorWithSecretsAttributes,
  SyntheticsMonitor,
  ConfigKey,
  MonitorLocations,
} from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { MonitorValidationError, normalizeAPIConfig, validateMonitor } from './monitor_validation';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import {
  sendTelemetryEvents,
  formatTelemetryUpdateEvent,
} from '../telemetry/monitor_upgrade_sender';
import { formatSecrets } from '../../synthetics_service/utils/secrets';
import { mapSavedObjectToMonitor } from './formatters/saved_object_to_monitor';

// Simplify return promise type and type it with runtime_types
export const editSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {},
  validation: {
    request: {
      params: schema.object({
        monitorId: schema.string(),
      }),
      query: schema.object({
        internal: schema.maybe(
          schema.boolean({
            defaultValue: false,
          })
        ),
      }),
      body: schema.any(),
    },
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response, spaceId, server, monitorConfigRepository } = routeContext;
    const { logger } = server;
    const monitor = request.body as SyntheticsMonitor;
    const reqQuery = request.query as { internal?: boolean };
    const { monitorId } = request.params;

    if (!monitor || typeof monitor !== 'object' || isEmpty(monitor) || Array.isArray(monitor)) {
      return response.badRequest({
        body: {
          message: 'Monitor must be a non-empty object',
        },
      });
    }
    if (monitor.origin && monitor.origin !== 'ui') {
      return response.badRequest(getInvalidOriginError(monitor));
    }

    const editMonitorAPI = new AddEditMonitorAPI(routeContext);
    if (monitor.name) {
      const nameError = await editMonitorAPI.validateUniqueMonitorName(monitor.name, monitorId);
      if (nameError) {
        return response.badRequest({
          body: { message: nameError, attributes: { details: nameError } },
        });
      }
    }

    try {
      /* Decrypting the previous monitor before editing ensures that all existing fields remain
       * on the object, even in flows where decryption does not take place, such as the enabled tab
       * on the monitor list table. We do not decrypt monitors in bulk for the monitor list table */
      const { decryptedMonitor: decryptedMonitorPrevMonitor, normalizedMonitor: previousMonitor } =
        await monitorConfigRepository.getDecrypted(monitorId, spaceId);
      const normalizedPreviousMonitor = previousMonitor.attributes;

      if (normalizedPreviousMonitor.origin !== 'ui' && !reqQuery.internal) {
        return response.badRequest(getInvalidOriginError(monitor));
      }

      let editedMonitor = mergeSourceMonitor(normalizedPreviousMonitor, monitor);

      editMonitorAPI.validateMonitorType(
        editedMonitor as MonitorFields,
        normalizedPreviousMonitor as MonitorFields
      );

      const { errorMessage: unsupportedKeysErrors, formattedConfig } = normalizeAPIConfig(
        editedMonitor as CreateMonitorPayLoad
      );
      if (unsupportedKeysErrors) {
        return response.badRequest({
          body: {
            message: unsupportedKeysErrors,
            attributes: { details: unsupportedKeysErrors },
          },
        });
      }

      editedMonitor = await editMonitorAPI.normalizeMonitor(
        formattedConfig as CreateMonitorPayLoad,
        monitor as CreateMonitorPayLoad,
        previousMonitor.attributes.locations
      );

      const validationResult = validateMonitor(editedMonitor as MonitorFields, spaceId);

      if (!validationResult.valid || !validationResult.decodedMonitor) {
        const { reason: message, details, payload } = validationResult;
        return response.badRequest({ body: { message, attributes: { details, ...payload } } });
      }

      const err = await validatePermissions(routeContext, editedMonitor.locations);
      if (err) {
        return response.forbidden({
          body: {
            message: err,
          },
        });
      }

      const monitorWithRevision = {
        ...validationResult.decodedMonitor,
        /* reset config hash to empty string. Ensures that the synthetics agent is able
         * to update project monitors on when next pushed after they are edited via the UI,
         * through the enable/disable monitor toggle */
        [ConfigKey.CONFIG_HASH]: '',
        revision: (previousMonitor.attributes[ConfigKey.REVISION] || 0) + 1,
      };

      const {
        publicSyncErrors,
        failedPolicyUpdates,
        editedMonitor: editedMonitorSavedObject,
      } = await syncEditedMonitor({
        routeContext,
        decryptedPreviousMonitor: decryptedMonitorPrevMonitor,
        normalizedMonitor: monitorWithRevision,
        spaceId,
      });
      if (failedPolicyUpdates && failedPolicyUpdates.length > 0) {
        const hasError = failedPolicyUpdates.find((update) => update.error);
        await rollbackUpdate({
          routeContext,
          configId: monitorId,
          attributes: decryptedMonitorPrevMonitor.attributes,
        });
        throw hasError?.error;
      }

      // Return service sync errors in OK response
      if (publicSyncErrors && publicSyncErrors.length > 0) {
        return response.ok({
          body: {
            message: 'error pushing monitor to the service',
            attributes: { errors: publicSyncErrors },
          },
        });
      }

      return mapSavedObjectToMonitor({
        internal: reqQuery.internal,
        monitor: {
          ...(editedMonitorSavedObject as SavedObject<EncryptedSyntheticsMonitorAttributes>),
          created_at: previousMonitor.created_at,
        },
      });
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }
      if (error instanceof InvalidLocationError || error instanceof InvalidScheduleError) {
        return response.badRequest({ body: { message: error.message } });
      }
      if (error instanceof MonitorValidationError) {
        const { reason: message, details, payload } = error.result;
        return response.badRequest({ body: { message, attributes: { details, ...payload } } });
      }

      logger.error(
        `Unable to update Synthetics monitor with id ${monitorId}, Error: ${error.message}`,
        { error }
      );
      return response.customError({
        body: { message: error.message },
        statusCode: 500,
      });
    }
  },
});

const rollbackUpdate = async ({
  routeContext,
  configId,
  attributes,
}: {
  attributes: SyntheticsMonitorWithSecretsAttributes;
  configId: string;
  routeContext: RouteContext;
}) => {
  const { savedObjectsClient, server } = routeContext;
  try {
    await savedObjectsClient.update<MonitorFields>(
      syntheticsMonitorSavedObjectType,
      configId,
      attributes
    );
  } catch (error) {
    server.logger.error(
      `Unable to rollback edit for Synthetics monitor with id ${configId}, Error: ${error.message}`,
      {
        error,
      }
    );
  }
};

export const syncEditedMonitor = async ({
  normalizedMonitor,
  decryptedPreviousMonitor,
  spaceId,
  routeContext,
}: {
  normalizedMonitor: SyntheticsMonitor;
  decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecretsAttributes>;
  routeContext: RouteContext;
  spaceId: string;
}) => {
  const { server, savedObjectsClient, syntheticsMonitorClient, monitorConfigRepository } =
    routeContext;
  try {
    const monitorWithId = {
      ...normalizedMonitor,
      [ConfigKey.MONITOR_QUERY_ID]:
        normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || decryptedPreviousMonitor.id,
      [ConfigKey.CONFIG_ID]: decryptedPreviousMonitor.id,
      [ConfigKey.KIBANA_SPACES]:
        normalizedMonitor[ConfigKey.KIBANA_SPACES] || decryptedPreviousMonitor.namespaces,
    };
    const formattedMonitor = formatSecrets(monitorWithId);
    const editedSOPromise = monitorConfigRepository.update(
      decryptedPreviousMonitor.id,
      formattedMonitor,
      decryptedPreviousMonitor
    );

    const allPrivateLocations = await getPrivateLocations(savedObjectsClient);

    const editSyncPromise = syntheticsMonitorClient.editMonitors(
      [
        {
          monitor: monitorWithId as MonitorFields,
          id: decryptedPreviousMonitor.id,
          decryptedPreviousMonitor,
        },
      ],
      allPrivateLocations,
      spaceId
    );

    const [editedMonitorSavedObject, { publicSyncErrors, failedPolicyUpdates }] = await Promise.all(
      [editedSOPromise, editSyncPromise]
    );

    sendTelemetryEvents(
      server.logger,
      server.telemetry,
      formatTelemetryUpdateEvent(
        editedMonitorSavedObject as SavedObjectsUpdateResponse<EncryptedSyntheticsMonitorAttributes>,
        decryptedPreviousMonitor.updated_at,
        server.stackVersion,
        Boolean((normalizedMonitor as MonitorFields)[ConfigKey.SOURCE_INLINE]),
        publicSyncErrors
      )
    );

    return {
      failedPolicyUpdates,
      publicSyncErrors,
      editedMonitor: {
        ...editedMonitorSavedObject,
        attributes: {
          ...editedMonitorSavedObject?.attributes,
          ...monitorWithId,
        },
      },
    };
  } catch (e) {
    await rollbackUpdate({
      routeContext,
      configId: decryptedPreviousMonitor.id,
      attributes: decryptedPreviousMonitor.attributes,
    });

    throw e;
  }
};

export const validatePermissions = async (
  routeContext: RouteContext,
  monitorLocations: MonitorLocations
) => {
  const hasPublicLocations = monitorLocations?.some((loc) => loc.isServiceManaged);
  if (!hasPublicLocations) {
    return;
  }

  const { elasticManagedLocationsEnabled } = await validateLocationPermissions(routeContext);
  if (!elasticManagedLocationsEnabled) {
    return ELASTIC_MANAGED_LOCATIONS_DISABLED;
  }
};

export const validateLocationPermissions = async ({ server, request }: RouteContext) => {
  const syntheticsFeature = await server.coreStart?.capabilities.resolveCapabilities(request, {
    capabilityPath: 'synthetics.*',
  });
  const elasticManagedLocationsEnabled =
    Boolean(syntheticsFeature.synthetics.elasticManagedLocationsEnabled) ?? true;
  const canManagePrivateLocations =
    Boolean(syntheticsFeature.synthetics.canManagePrivateLocations) ?? true;

  return {
    canManagePrivateLocations,
    elasticManagedLocationsEnabled,
  };
};

const getInvalidOriginError = (monitor: SyntheticsMonitor) => {
  return {
    body: {
      message: invalidOriginError(monitor.origin!),
      attributes: {
        details: invalidOriginError(monitor.origin!),
        payload: monitor,
      },
    },
  };
};
