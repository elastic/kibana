/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { DeleteMonitorAPI } from './services/delete_monitor_api';
import { SyntheticsRestApiRouteFactory } from '../types';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { ConfigKey } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getMonitors, getSavedObjectKqlFilter } from '../common';
import { validateSpaceId } from './services/validate_space_id';

export const deleteSyntheticsMonitorProjectRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE,
  validate: {
    body: schema.object({
      monitors: schema.arrayOf(schema.string()),
    }),
    params: schema.object({
      projectName: schema.string(),
    }),
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response } = routeContext;
    const { projectName } = request.params;
    const { monitors: monitorsToDelete } = request.body;
    const decodedProjectName = decodeURI(projectName);
    if (monitorsToDelete.length > 250) {
      return response.badRequest({
        body: {
          message: REQUEST_TOO_LARGE,
        },
      });
    }

    await validateSpaceId(routeContext);

    const deleteFilter = `${syntheticsMonitorType}.attributes.${
      ConfigKey.PROJECT_ID
    }: "${decodedProjectName}" AND ${getSavedObjectKqlFilter({
      field: 'journey_id',
      values: monitorsToDelete.map((id: string) => `${id}`),
    })}`;

    const { saved_objects: monitors } = await getMonitors(
      {
        ...routeContext,
        request: {
          ...request,
          query: { ...request.query, filter: deleteFilter, perPage: 500 },
        },
      },
      { fields: [] }
    );

    const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);

    await deleteMonitorAPI.deleteMonitorBulk({
      monitors,
    });

    return {
      deleted_monitors: monitorsToDelete,
    };
  },
});

export const REQUEST_TOO_LARGE = i18n.translate('xpack.synthetics.server.project.delete.toolarge', {
  defaultMessage:
    'Delete request payload is too large. Please send a max of 250 monitors to delete per request',
});
