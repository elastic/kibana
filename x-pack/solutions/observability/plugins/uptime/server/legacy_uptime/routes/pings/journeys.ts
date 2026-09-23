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
import {
  MAX_EVENT_TYPE_LENGTH,
  MAX_ID_LENGTH,
  boundedString,
  boundedStringArray,
} from '../schema_limits';

export const createJourneyRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.JOURNEY,
  validate: {
    params: schema.object({
      checkGroup: boundedString(MAX_ID_LENGTH),
    }),
    query: schema.object({
      // provides a filter for the types of synthetic events to include
      // when fetching a journey's data
      syntheticEventTypes: schema.maybe(
        schema.oneOf([
          boundedStringArray(MAX_EVENT_TYPE_LENGTH, 10),
          boundedString(MAX_EVENT_TYPE_LENGTH),
        ])
      ),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }): Promise<any> => {
    const { checkGroup } = request.params;
    const { syntheticEventTypes } = request.query;

    try {
      const [result, details] = await Promise.all([
        await libs.requests.getJourneySteps({
          uptimeEsClient,
          checkGroup,
          syntheticEventTypes,
        }),
        await libs.requests.getJourneyDetails({
          uptimeEsClient,
          checkGroup,
        }),
      ]);

      return {
        checkGroup,
        steps: result,
        details,
      };
    } catch (e: unknown) {
      return response.custom({ statusCode: 500, body: { message: e } });
    }
  },
});

export const createJourneyFailedStepsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.JOURNEY_FAILED_STEPS,
  validate: {
    query: schema.object({
      checkGroups: boundedStringArray(MAX_ID_LENGTH, 100),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }): Promise<any> => {
    const { checkGroups } = request.query;
    try {
      const result = await libs.requests.getJourneyFailedSteps({
        uptimeEsClient,
        checkGroups,
      });
      return {
        checkGroups,
        steps: result,
      };
    } catch (e) {
      return response.customError({ statusCode: 500, body: e });
    }
  },
});
