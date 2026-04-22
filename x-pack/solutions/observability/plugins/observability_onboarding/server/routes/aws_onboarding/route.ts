/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';

export interface HasAwsIngestDataRouteResponse {
  hasData: boolean;
}

const hasAwsIngestDataRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/aws/has-data',
  params: t.type({
    query: t.type({}),
  }),
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by Elasticsearch client',
    },
  },
  async handler(resources): Promise<HasAwsIngestDataRouteResponse> {
    const { elasticsearch } = await resources.context.core;

    try {
      const result = await elasticsearch.client.asCurrentUser.search({
        index: ['logs-aws*', 'metrics-aws*'],
        ignore_unavailable: true,
        allow_partial_search_results: true,
        size: 1,
        terminate_after: 1,
      });

      return {
        hasData: result.hits.hits.length > 0,
      };
    } catch (error) {
      const errorType = error?.meta?.body?.error?.type;
      const rootCauseType = error?.meta?.body?.error?.root_cause?.[0]?.type;

      if (
        errorType === 'search_phase_execution_exception' &&
        rootCauseType === 'no_shard_available_action_exception'
      ) {
        return {
          hasData: false,
        };
      }

      throw Boom.internal(`Elasticsearch responded with an error. ${error.message}`);
    }
  },
});

export const awsOnboardingRouteRepository = {
  ...hasAwsIngestDataRoute,
};
