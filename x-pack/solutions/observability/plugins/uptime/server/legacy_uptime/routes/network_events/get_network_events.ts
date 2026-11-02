/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UMServerLibs } from '../../lib/lib';
import type { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../../common/constants';
import { MAX_ID_LENGTH, boundedString } from '../schema_limits';

export const createNetworkEventsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.NETWORK_EVENTS,
  validate: {
    query: schema.object({
      checkGroup: boundedString(MAX_ID_LENGTH),
      stepIndex: schema.number(),
    }),
  },
  handler: async ({ uptimeEsClient, request }): Promise<any> => {
    const { checkGroup, stepIndex } = request.query;

    const result = await libs.requests.getNetworkEvents({
      uptimeEsClient,
      checkGroup,
      stepIndex,
    });

    return result;
  },
});
