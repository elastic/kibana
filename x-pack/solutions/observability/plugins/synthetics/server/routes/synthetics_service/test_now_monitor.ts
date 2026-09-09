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
import { ConfigKey, MonitorFields } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getPrivateLocationsForMonitor } from '../monitor_cruds/add_monitor/utils';
import { getMonitorNotFoundResponse } from './service_errors';
import { MONITOR_RUN_MANUALLY_API } from '../../feature';

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
<<<<<<< HEAD
  writeAccess: true,
=======
  // Running a monitor is read-plus-execute (it never mutates the monitor SO), so it
  // does not require `uptime-write`. Instead it needs EITHER `uptime-write` (so existing
  // write users keep working, non-breaking) OR the `monitor-run-manually` sub-feature privilege,
  // which grants manual runs to an otherwise read-only role.
  writeAccess: false,
  anyRequiredPrivileges: ['uptime-write', MONITOR_RUN_MANUALLY_API],
  options: { availability: { since: '9.2.0' } },
>>>>>>> e264fc085397 ([Synthetics] Add "Run tests manually" sub-feature privilege (monitor:run-manually) (#282149))
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
      savedObjectsClient,
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
