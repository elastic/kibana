/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getJourneyScreenshot } from '../../queries/get_journey_screenshot';
import { getLastSuccessfulCheck } from '../../queries/get_last_successful_check';
import { isFullScreenshot, isRefResult, Ping } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../types';

export const createLastSuccessfulCheckRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_SUCCESSFUL_CHECK,
  validate: {
    query: schema.object({
      monitorId: schema.string(),
      stepIndex: schema.number(),
      timestamp: schema.string(),
      location: schema.maybe(schema.string()),
    }),
  },
  handler: async (routeProps) => {
    return await getLastSuccessfulCheckScreenshot(routeProps);
  },
});

export const getLastSuccessfulCheckScreenshot = async ({
  response,
  request,
  syntheticsEsClient,
}: RouteContext) => {
  const { timestamp, monitorId, stepIndex, location } = request.query;

  const check: Ping | null = await getLastSuccessfulCheck({
    syntheticsEsClient,
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
    syntheticsEsClient,
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
