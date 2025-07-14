/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { v4 as uuidv4 } from 'uuid';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { IKibanaResponse } from '@kbn/core-http-server';
import { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../types';
import { TestNowResponse } from '../../../common/types';
import { ConfigKey, MonitorFields, SyntheticsMonitor } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getPrivateLocationsForMonitor } from '../monitor_cruds/add_monitor/utils';
import { getMonitorNotFoundResponse } from './service_errors';
import { NO_BACKTICKS_ERROR_MESSAGE } from '../../../common/translations/translations';

export const testNowMonitorRoute: SyntheticsRestApiRouteFactory<TestNowResponse> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.TRIGGER_MONITOR + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async (routeContext) => {
    const { monitorId } = routeContext.request.params;
    return triggerTestNow(monitorId, routeContext);
  },
  writeAccess: true,
});

export const triggerTestNow = async (
  monitorId: string,
  routeContext: RouteContext
): Promise<TestNowResponse | IKibanaResponse<any>> => {
  const {
    spaceId,
    syntheticsMonitorClient,
    savedObjectsClient,
    response,
    monitorConfigRepository,
  } = routeContext;

  try {
    const { normalizedMonitor } = await monitorConfigRepository.getDecrypted(monitorId, spaceId);

    // Narrow SyntheticsMonitor to the browser variant that contains an inline script
    const hasInlineScript = (
      m: SyntheticsMonitor
    ): m is SyntheticsMonitor & {
      [ConfigKey.SOURCE_INLINE]: string;
    } => typeof (m as any)[ConfigKey.SOURCE_INLINE] === 'string';

    const monitorAttrs = normalizedMonitor.attributes as SyntheticsMonitor;

    if (hasInlineScript(monitorAttrs) && monitorAttrs[ConfigKey.SOURCE_INLINE].includes('`')) {
      return response.badRequest({
        body: {
          message: NO_BACKTICKS_ERROR_MESSAGE,
        },
      });
    }

    const { [ConfigKey.SCHEDULE]: schedule, [ConfigKey.LOCATIONS]: locations } =
      normalizedMonitor.attributes;

    const privateLocations: PrivateLocationAttributes[] = await getPrivateLocationsForMonitor(
      savedObjectsClient,
      normalizedMonitor.attributes
    );
    const testRunId = uuidv4();

    const [, errors] = await syntheticsMonitorClient.testNowConfigs(
      {
        monitor: normalizedMonitor.attributes as MonitorFields,
        id: monitorId,
        testRunId,
      },
      privateLocations,
      spaceId
    );

    if (errors && errors?.length > 0) {
      return {
        errors,
        testRunId,
        schedule,
        locations,
        configId: monitorId,
        monitor: normalizedMonitor.attributes,
      };
    }

    return {
      testRunId,
      schedule,
      locations,
      configId: monitorId,
      monitor: normalizedMonitor.attributes,
    };
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return getMonitorNotFoundResponse(response, monitorId);
    }

    throw getErr;
  }
};
