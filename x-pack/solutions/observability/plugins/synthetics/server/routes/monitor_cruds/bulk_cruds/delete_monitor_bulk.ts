/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { z } from '@kbn/zod';
import { MAX_MONITOR_BULK_SIZE, routeId } from '../../zod_query';
import { DeleteMonitorAPI } from '../services/delete_monitor_api';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../../types';

export const deleteSyntheticsMonitorBulkRoute: SyntheticsRestApiRouteFactory<
  Array<{ id: string; deleted: boolean }>,
  Record<string, string>,
  Record<string, string>,
  { ids: string[] }
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/_bulk_delete',
  options: {
    summary: 'Delete monitors',
    description: 'Delete multiple monitors by sending a list of config IDs.',
    operationId: 'delete-synthetic-monitors',
    oasOperationObject: () => path.join(__dirname, '../examples/bulk_delete_monitors.yaml'),
  },
  validate: {},
  validation: {
    request: {
      body: z.strictObject({
        ids: z
          .array(routeId)
          .min(1)
          .max(MAX_MONITOR_BULK_SIZE)
          .describe('An array of monitor IDs to delete.'),
      }),
    },
  },
  handler: async (routeContext): Promise<any> => {
    const { request } = routeContext;

    const { ids: idsToDelete } = request.body || {};
    const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);

    const { errors, result, res } = await deleteMonitorAPI.execute({
      monitorIds: idsToDelete,
    });

    if (res) {
      return res;
    }

    return { result, errors };
  },
});
