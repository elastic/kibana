/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { queryBoolean, routeId } from '../zod_query';
import type { SyntheticsJourneyApiResponse } from '../../../common/runtime_types';
import { getJourneySteps } from '../../queries/get_journey_steps';
import { getJourneyDetails } from '../../queries/get_journey_details';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const createJourneyRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.JOURNEY,
  validate: {
    params: z.strictObject({
      checkGroup: routeId,
    }),
    query: z.strictObject({
      remoteName: z.string().max(256).optional(),
      timestamp: z.string().max(30).optional(),
      // Screenshot-only callers (e.g. the "Last 10 test runs" thumbnails) only
      // need `steps`. They set this to skip the `getJourneyDetails` lookup,
      // which also fans out unbounded sibling (prev/next) queries.
      stepsOnly: queryBoolean.optional(),
    }),
  },
  handler: async ({
    syntheticsEsClient,
    request,
    response,
  }): Promise<SyntheticsJourneyApiResponse> => {
    const { checkGroup } = request.params;
    const { remoteName, timestamp, stepsOnly } = request.query;

    const [steps, details] = await Promise.all([
      getJourneySteps({
        syntheticsEsClient,
        checkGroup,
        remoteName,
        timestamp,
      }),
      stepsOnly
        ? Promise.resolve(null)
        : getJourneyDetails({
            syntheticsEsClient,
            checkGroup,
            remoteName,
            timestamp,
          }),
    ]);

    return {
      steps,
      details,
      checkGroup,
    };
  },
});
