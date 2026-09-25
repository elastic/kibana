/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getJourneyScreenshot } from '../../lib/requests/get_journey_screenshot';
import { isRefResult, isFullScreenshot } from '../../../../common/runtime_types/ping/synthetics';
import type { Ping } from '../../../../common/runtime_types/ping/ping';
import type { UMServerLibs } from '../../lib/lib';
import type { RouteContext, UMRestApiRouteFactory, UptimeRouteContext } from '../types';
import { API_URLS } from '../../../../common/constants';
import {
  MAX_ID_LENGTH,
  MAX_LOCATION_NAME_LENGTH,
  MAX_TIMESTAMP_LENGTH,
  boundedString,
  optionalBoundedString,
} from '../schema_limits';
import { getLastSuccessfulCheck } from '../../lib/requests/get_last_successful_check';

export const createLastSuccessfulCheckRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_SUCCESSFUL_CHECK,
  validate: {
    query: schema.object({
      monitorId: boundedString(MAX_ID_LENGTH),
      stepIndex: schema.number(),
      timestamp: boundedString(MAX_TIMESTAMP_LENGTH),
      location: optionalBoundedString(MAX_LOCATION_NAME_LENGTH),
    }),
  },
  handler: async (routeProps) => {
    return await getLastSuccessfulCheckScreenshot(routeProps);
  },
});

export const getLastSuccessfulCheckScreenshot = async ({
  response,
  request,
  uptimeEsClient,
}: RouteContext | UptimeRouteContext) => {
  const { timestamp, monitorId, stepIndex, location } = request.query;

  const check: Ping | null = await getLastSuccessfulCheck({
    uptimeEsClient,
    monitorId,
    timestamp,
    location,
  });

  if (check === null) {
    return response.notFound();
  }

  if (!check.monitor.check_group) {
    return response.ok({ body: check });
  }

  const screenshot = await getJourneyScreenshot({
    uptimeEsClient,
    checkGroup: check.monitor.check_group,
    stepIndex,
  });

  if (screenshot === null) {
    return response.ok({ body: check });
  }

  if (check.synthetics) {
    check.synthetics.isScreenshotRef = isRefResult(screenshot);
    check.synthetics.isFullScreenshot = isFullScreenshot(screenshot);
  }

  return response.ok({
    body: check,
  });
};
