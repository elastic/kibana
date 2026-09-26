/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { isEmpty } from 'lodash';
import { routeId } from '../zod_query';
import { createMonitorRequestBody } from '../monitor_cruds/monitor_request_body';
import type { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { getPrivateLocationsForMonitor } from '../monitor_cruds/add_monitor/utils';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../types';
import type { MonitorFields, SyntheticsMonitor } from '../../../common/runtime_types';
import { ConfigKey } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { restoreMaskedMonitorParams } from '../../../common/utils/mask_monitor_params';
import { validateMonitor } from '../monitor_cruds/monitor_validation';

export const runOnceSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.RUN_ONCE_MONITOR + '/{monitorId}',
  validate: {
    body: createMonitorRequestBody,
    params: z.strictObject({
      monitorId: routeId,
    }),
  },
  handler: async ({
    request,
    response,
    server,
    syntheticsMonitorClient,
    savedObjectsClient,
    monitorConfigRepository,
    spaceId,
  }): Promise<any> => {
    const monitor = request.body as MonitorFields;
    const { monitorId } = request.params;
    if (isEmpty(monitor)) {
      return response.badRequest({ body: { message: 'Monitor data is empty.' } });
    }

    const validationResult = validateMonitor(monitor, spaceId, server.cloud?.isServerlessEnabled);

    const decodedMonitor = validationResult.decodedMonitor;
    if (!validationResult.valid || !decodedMonitor) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    const privateLocations: PrivateLocationAttributes[] = await getPrivateLocationsForMonitor(
      savedObjectsClient,
      decodedMonitor
    );

    // The path id is a one-off run id. Callers who cannot read parameter values
    // submit placeholders; restore those from the saved monitor and keep them
    // out of the HTTP response.
    const paramsForRun = await restoreStoredParamsForRun({
      monitorConfigRepository,
      spaceId,
      configId: decodedMonitor[ConfigKey.CONFIG_ID],
      submittedParams: decodedMonitor[ConfigKey.PARAMS],
    });

    const [, errors] = await syntheticsMonitorClient.testNowConfigs(
      {
        monitor: {
          ...decodedMonitor,
          [ConfigKey.PARAMS]: paramsForRun,
          [ConfigKey.CONFIG_ID]: monitorId,
          [ConfigKey.MONITOR_QUERY_ID]: monitorId,
        } as MonitorFields,
        id: monitorId,
        testRunId: monitorId,
      },
      privateLocations,
      spaceId,
      true
    );

    if (errors) {
      return { errors };
    }

    return monitor;
  },
});

const restoreStoredParamsForRun = async ({
  monitorConfigRepository,
  spaceId,
  configId,
  submittedParams,
}: {
  monitorConfigRepository: RouteContext['monitorConfigRepository'];
  spaceId: string;
  configId?: string;
  submittedParams?: string;
}): Promise<SyntheticsMonitor[ConfigKey.PARAMS]> => {
  if (!configId) {
    return submittedParams;
  }

  try {
    const { normalizedMonitor } = await monitorConfigRepository.getDecrypted(configId, spaceId);
    return restoreMaskedMonitorParams({
      previousParams: normalizedMonitor.attributes[ConfigKey.PARAMS],
      submittedParams,
    });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return submittedParams;
    }
    throw error;
  }
};
