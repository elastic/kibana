/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import {
  asRouteSchema,
  maxArraySizeMessage,
  MAX_MONITOR_BATCH_SIZE,
  routeId,
} from '../../zod_query';
import { syntheticsMonitorAttributes } from '../../../../common/types/saved_objects';
import { DeleteMonitorAPI } from '../services/delete_monitor_api';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import type { EncryptedSyntheticsMonitorAttributes } from '../../../../common/runtime_types';
import { ConfigKey } from '../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { getSavedObjectKqlFilter } from '../../common';
import { validateSpaceId } from '../services/validate_space_id';

export const deleteSyntheticsMonitorProjectRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE,
  validate: {
    body: asRouteSchema(
      z.object({
        monitors: z
          .array(routeId)
          .max(MAX_MONITOR_BATCH_SIZE, { error: maxArraySizeMessage(MAX_MONITOR_BATCH_SIZE) }),
      })
    ),
    params: z.strictObject({
      projectName: routeId,
    }),
  },
  handler: async (routeContext): Promise<any> => {
    const { request, monitorConfigRepository } = routeContext;
    const { projectName } = request.params;
    const { monitors: monitorsToDelete } = request.body;
    const decodedProjectName = decodeURI(projectName);

    await validateSpaceId(routeContext);

    const deleteFilter = `${syntheticsMonitorAttributes}.${
      ConfigKey.PROJECT_ID
    }: "${decodedProjectName}" AND ${getSavedObjectKqlFilter({
      field: 'journey_id',
      values: monitorsToDelete.map((id: string) => `${id}`),
    })}`;

    const { saved_objects: monitors } =
      await monitorConfigRepository.find<EncryptedSyntheticsMonitorAttributes>({
        perPage: MAX_MONITOR_BATCH_SIZE,
        filter: deleteFilter,
        fields: [],
      });

    const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);

    const { res } = await deleteMonitorAPI.execute({
      monitorIds: monitors.map(({ id }) => id),
    });

    if (res) {
      return res;
    }

    return {
      deleted_monitors: monitorsToDelete,
    };
  },
});
