/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Ping } from '../../../common/runtime_types';
import { getLatestTestRun } from '../../queries/get_latest_test_run';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getLatestTestRunRouteQuerySchema = schema.object({
  from: schema.maybe(schema.string()),
  to: schema.maybe(schema.string()),
  locationLabel: schema.maybe(schema.string()),
  monitorId: schema.string(),
});

type GetPingsRouteRequest = TypeOf<typeof getLatestTestRunRouteQuerySchema>;

export const syntheticsGetLatestTestRunRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.LATEST_TEST_RUN,
  validate: {},
  validation: {
    request: {
      query: getLatestTestRunRouteQuerySchema,
    },
  },
  handler: async ({ syntheticsEsClient, request, response }): Promise<{ ping?: Ping }> => {
    const { from, to, monitorId, locationLabel } = request.query as GetPingsRouteRequest;

    const getPing = (fromVal: string) => {
      return getLatestTestRun({
        syntheticsEsClient,
        from: fromVal,
        to: to || 'now',
        monitorId,
        locationLabel,
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
