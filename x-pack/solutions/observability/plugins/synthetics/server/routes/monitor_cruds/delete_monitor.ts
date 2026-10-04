/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';
import { MAX_MONITOR_BULK_SIZE, routeId } from '../zod_query';
import { DeleteMonitorAPI } from './services/delete_monitor_api';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../types';
import type { DeleteParamsResponse } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

const deleteMonitors = async (routeContext: RouteContext, monitorIds: string[]): Promise<any> => {
  const { response } = routeContext;
  const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);
  const { errors, res } = await deleteMonitorAPI.execute({ monitorIds });

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
};

export const deleteSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  { monitorId: string }
> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {},
  validation: {
    request: {
      params: z.strictObject({
        monitorId: routeId,
      }),
    },
  },
  handler: async (routeContext) =>
    deleteMonitors(routeContext, [routeContext.request.params.monitorId]),
});

/** Superseded by `POST /monitors/_bulk_delete`; kept for existing clients. */
export const deleteSyntheticsMonitorsRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  Record<string, string>,
  Record<string, string>,
  { ids: string[] }
> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
  validate: {},
  validation: {
    request: {
      body: z.strictObject({
        ids: z.array(routeId).min(1).max(MAX_MONITOR_BULK_SIZE),
      }),
    },
  },
  handler: async (routeContext) => deleteMonitors(routeContext, routeContext.request.body.ids),
});
