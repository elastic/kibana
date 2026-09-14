/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { queryNumber, routeId } from '../zod_query';
import { journeyScreenshotHandler } from '../../queries/journey_screenshots';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const createJourneyScreenshotRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.JOURNEY_SCREENSHOT,
  validate: {
    params: z.object({
      checkGroup: routeId,
      stepIndex: queryNumber,
    }),
    query: z.object({
      remoteName: z.string().max(256).optional(),
      timestamp: z.string().max(30).optional(),
    }),
  },
  handler: async (routeProps) => {
    return await journeyScreenshotHandler(routeProps);
  },
});
