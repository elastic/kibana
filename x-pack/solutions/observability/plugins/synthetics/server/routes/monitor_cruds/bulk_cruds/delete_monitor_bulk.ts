/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DeleteMonitorAPI } from '../services/delete_monitor_api';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { SyntheticsRestApiRouteFactory } from '../../types';

export const deleteSyntheticsMonitorBulkRoute: SyntheticsRestApiRouteFactory<
  Array<{ id: string; deleted: boolean }>,
  Record<string, string>,
  Record<string, string>,
  { ids: string[] }
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/_bulk_delete',
  validate: {},
  validation: {
    request: {
      body: schema.object({
        ids: schema.arrayOf(schema.string(), {
          minSize: 1,
        }),
      }),
    },
  },
  handler: async (routeContext): Promise<any> => {
    const { request } = routeContext;

    const { ids: idsToDelete } = request.body || {};
    const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);

    const { errors, result } = await deleteMonitorAPI.execute({
      monitorIds: idsToDelete,
    });

    return { result, errors };
  },
});
