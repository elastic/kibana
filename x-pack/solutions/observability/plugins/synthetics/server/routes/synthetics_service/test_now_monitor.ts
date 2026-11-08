/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'path';
import { z } from '@kbn/zod';
import { v4 as uuidv4 } from 'uuid';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { routeId } from '../zod_query';
import type { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../types';
import type { TestNowResponse } from '../../../common/types';
import type { MonitorFields } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getPrivateLocationsForMonitor } from '../monitor_cruds/add_monitor/utils';
import { getMonitorNotFoundResponse } from './service_errors';
import { MONITOR_RUN_MANUALLY_API } from '../../feature';

export const testNowMonitorRoute: SyntheticsRestApiRouteFactory<TestNowResponse> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.TEST_NOW_MONITOR + '/{monitorId}',
  validate: {},
  validation: {
    request: {
      params: z.strictObject({
        monitorId: routeId.describe('The ID (config_id) of the monitor to test.'),
      }),
    },
  },
  handler: async (routeContext) => {
    const { monitorId } = routeContext.request.params;
    return triggerTestNow(monitorId, routeContext);
  },
  // Running a monitor is read-plus-execute (it never mutates the monitor SO), so it
  // does not require `uptime-write`. Instead it needs EITHER `uptime-write` (so existing
  // write users keep working, non-breaking) OR the `monitor-run-manually` sub-feature privilege,
  // which grants manual runs to an otherwise read-only role.
  writeAccess: false,
  anyRequiredPrivileges: ['uptime-write', MONITOR_RUN_MANUALLY_API],
  options: {
    summary: 'Trigger an on-demand test run for a monitor',
    description:
      'Trigger an immediate test execution for the specified monitor.\nThe response includes the generated `testRunId`. If the test encounters issues in one or more service locations, an `errors` array is also returned with details about the failures.',
    operationId: 'post-synthetics-monitor-test',
    availability: { stability: 'stable', since: '9.2.0' },
    oasOperationObject: () => path.join(__dirname, 'examples/test_now_monitor.yaml'),
  },
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
      };
    }

    return {
      testRunId,
    };
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return getMonitorNotFoundResponse(response, monitorId);
    }

    throw getErr;
  }
};
