/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
} from '../../../../common/types/saved_objects';
import { validateSpaceId } from '../services/validate_space_id';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import { ProjectMonitor } from '../../../../common/runtime_types';

import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { ProjectMonitorFormatter } from '../../../synthetics_service/project_monitor/project_monitor_formatter';

const MAX_PAYLOAD_SIZE = 1048576 * 100; // 100MiB

export const addSyntheticsProjectMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE,
  validate: {
    query: schema.object({
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
    params: schema.object({
      projectName: schema.string(),
    }),
    body: schema.object({
      monitors: schema.arrayOf(schema.any()),
    }),
  },
  options: {
    body: {
      maxBytes: MAX_PAYLOAD_SIZE,
    },
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response, server } = routeContext;
    const { projectName } = request.params;
    const decodedProjectName = decodeURI(projectName);
    const monitors = (request.body?.monitors as ProjectMonitor[]) || [];
    const lightWeightMonitors = monitors.filter((monitor) => monitor.type !== 'browser');
    const browserMonitors = monitors.filter((monitor) => monitor.type === 'browser');

    if (browserMonitors.length > 250) {
      return response.badRequest({
        body: {
          message: REQUEST_TOO_LARGE,
        },
      });
    }
    if (lightWeightMonitors.length > 1500) {
      return response.badRequest({
        body: {
          message: REQUEST_TOO_LARGE_LIGHTWEIGHT,
        },
      });
    }

    try {
      const [spaceId, permissionError] = await Promise.all([
        validateSpaceId(routeContext),
        validatePermissions(routeContext, monitors),
      ]);

      if (permissionError) {
        return response.forbidden({ body: { message: permissionError } });
      }

      const pushMonitorFormatter = new ProjectMonitorFormatter({
        routeContext,
        projectId: decodedProjectName,
        spaceId,
        monitors,
      });

      await pushMonitorFormatter.configureAllProjectMonitors();

      return {
        createdMonitors: pushMonitorFormatter.createdMonitors,
        updatedMonitors: pushMonitorFormatter.updatedMonitors,
        failedMonitors: pushMonitorFormatter.failedMonitors,
      };
    } catch (error) {
      if (error.output?.statusCode === 404) {
        const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        return response.notFound({ body: { message: `Kibana space '${spaceId}' does not exist` } });
      }

      server.logger.error(`Error adding monitors to project ${decodedProjectName}`, { error });
      throw error;
    }
  },
});

export const REQUEST_TOO_LARGE = i18n.translate('xpack.synthetics.server.project.delete.request', {
  defaultMessage:
    'Request payload is too large. Please send a max of 250 browser monitors per request.',
});

export const REQUEST_TOO_LARGE_LIGHTWEIGHT = i18n.translate(
  'xpack.synthetics.server.project.delete.request.lightweight',
  {
    defaultMessage:
      'Request payload is too large. Please send a max of 1500 lightweight monitors per request.',
  }
);

export const validatePermissions = async (
  { server, response, request }: RouteContext,
  projectMonitors: ProjectMonitor[]
) => {
  const hasPublicLocations = projectMonitors.some(({ locations }) => (locations ?? []).length > 0);
  if (!hasPublicLocations) {
    return;
  }

  const elasticManagedLocationsEnabled =
    Boolean(
      (
        await server.coreStart?.capabilities.resolveCapabilities(request, {
          capabilityPath: 'uptime.*',
        })
      ).uptime.elasticManagedLocationsEnabled
    ) ?? true;
  if (!elasticManagedLocationsEnabled) {
    return ELASTIC_MANAGED_LOCATIONS_DISABLED;
  }
};

export const ELASTIC_MANAGED_LOCATIONS_DISABLED = i18n.translate(
  'xpack.synthetics.noAccess.publicLocations',
  {
    defaultMessage:
      "You don't have permission to use Elastic managed global locations. Please contact your Kibana administrator.",
  }
);
