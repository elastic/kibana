/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { optionalQueryString, routeId, MAX_DATE_RANGE_LENGTH } from '../zod_query';
import type { Ping } from '../../../common/runtime_types';
import { getLatestTestRun } from '../../queries/get_latest_test_run';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getLatestTestRunRouteQuerySchema = z.strictObject({
  from: z.string().max(MAX_DATE_RANGE_LENGTH).optional(),
  to: z.string().max(MAX_DATE_RANGE_LENGTH).optional(),
  locationLabel: optionalQueryString,
  locationId: optionalQueryString,
  monitorId: routeId,
  remoteName: z.string().max(256).optional(),
});

type GetPingsRouteRequest = z.infer<typeof getLatestTestRunRouteQuerySchema>;

export const syntheticsGetLatestTestRunRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.LATEST_TEST_RUN,
  // Public for the Synthetics UI; not a documented API.
  options: { excludeFromOAS: true },
  validate: {},
  validation: {
    request: {
      query: getLatestTestRunRouteQuerySchema,
    },
  },
  handler: async ({ syntheticsEsClient, request, response }): Promise<{ ping?: Ping }> => {
    const { from, to, monitorId, locationLabel, locationId, remoteName } =
      request.query as GetPingsRouteRequest;

    const getPing = (fromVal: string) => {
      return getLatestTestRun({
        syntheticsEsClient,
        from: fromVal,
        to: to || 'now',
        monitorId,
        locationLabel,
        locationId,
        remoteName,
      });
    };

    // we will try to get the latest ping from the last day,
    // if it doesn't exist we will try to get the latest ping from the last week
    const ping = await getPing(from || 'now-1d');

    // if from is provided, we will only try to get the latest ping from the provided time range
    if (ping && from) {
      return { ping };
    }
    // fall back to 1w and then max 30 days
    return { ping: (await getPing('now-1w')) || (await getPing('now-30d')) };
  },
});
