/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';
import { MAX_MONITOR_BULK_SIZE, optionalRouteId, routeId } from '../zod_query';
import { DeleteMonitorAPI } from './services/delete_monitor_api';
import type { SyntheticsRestApiRouteFactory } from '../types';
import type { DeleteParamsResponse } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const deleteSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  Record<string, string>,
  Record<string, string>,
  { ids: string[] }
> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/{id?}',
  validate: {},
  validation: {
    request: {
      body: z
        .strictObject({
          ids: z.array(routeId).min(1).max(MAX_MONITOR_BULK_SIZE),
        })
        .nullable(),
      params: z.strictObject({
        id: optionalRouteId,
      }),
    },
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response } = routeContext;

    const { ids } = request.body || {};
    const { id: queryId } = request.params;

    if (ids && queryId) {
      return response.badRequest({
        body: {
          message: i18n.translate('xpack.synthetics.deleteMonitor.errorMultipleIdsProvided', {
            defaultMessage: 'id must be provided either via param or body.',
          }),
        },
      });
    }

    const idsToDelete = [...(ids ?? []), ...(queryId ? [queryId] : [])];
    if (idsToDelete.length === 0) {
      return response.badRequest({
        body: {
          message: i18n.translate('xpack.synthetics.deleteMonitor.errorMultipleIdsProvided', {
            defaultMessage: 'id must be provided either via param or body.',
          }),
        },
      });
    }

    const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);
    const { errors, res } = await deleteMonitorAPI.execute({
      monitorIds: idsToDelete,
    });

    if (res) {
      return res;
    }

    if (errors && errors.length > 0) {
      return response.ok({
        body: {
          message: i18n.translate('xpack.synthetics.deleteMonitor.errorPushingMonitorToService', {
            defaultMessage: 'Error pushing monitor to the service',
          }),
          attributes: { errors },
        },
      });
    }

    return deleteMonitorAPI.result;
  },
});
