/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IKibanaResponse } from '@kbn/core-http-server';
import { schema } from '@kbn/config-schema';
import { isRefResult, RefResult } from '../../../../common/runtime_types/ping/synthetics';
import { UMServerLibs } from '../../lib/lib';
import {
  getJourneyScreenshot,
  ScreenshotReturnTypesUnion,
} from '../../lib/requests/get_journey_screenshot';
import { RouteContext, UMRestApiRouteFactory, UptimeRouteContext } from '../types';
import { API_URLS } from '../../../../common/constants';

export interface ClientContract {
  screenshotRef: RefResult;
}

function getSharedHeaders(stepName: string, totalSteps: number) {
  return {
    'cache-control': 'max-age=600',
    'caption-name': stepName,
    'max-steps': String(totalSteps),
  };
}

export const createJourneyScreenshotRoute: UMRestApiRouteFactory<ClientContract> = (
  _libs: UMServerLibs
) => ({
  method: 'GET',
  path: API_URLS.JOURNEY_SCREENSHOT,
  validate: {
    params: schema.object({
      checkGroup: schema.string(),
      stepIndex: schema.number(),
    }),
  },
  handler: async (routeProps) => {
    return await journeyScreenshotHandler(routeProps);
  },
});

export const journeyScreenshotHandler = async ({
  response,
  request,
  uptimeEsClient,
}: RouteContext | UptimeRouteContext): Promise<IKibanaResponse<ClientContract>> => {
  const { checkGroup, stepIndex } = request.params;

  const result: ScreenshotReturnTypesUnion | null = await getJourneyScreenshot({
    uptimeEsClient,
    checkGroup,
    stepIndex,
  });

  if (isRefResult(result)) {
    return response.ok({
      body: {
        screenshotRef: result,
      },
      headers: getSharedHeaders(result.synthetics.step.name, result.totalSteps),
    });
  }

  return response.notFound();
};
