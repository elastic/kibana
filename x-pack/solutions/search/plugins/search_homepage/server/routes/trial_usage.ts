/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { GET_TRIAL_USAGE_ROUTE } from '../../common/routes';
import type { RouterContextData, TrialUsageResponse } from '../types';

export const registerTrialUsageRoute = (
  router: IRouter,
  _logger: Logger,
  { trialEndDate }: RouterContextData
): void => {
  router.get<unknown, unknown, TrialUsageResponse>(
    {
      path: GET_TRIAL_USAGE_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {},
      options: {
        access: 'internal',
      },
    },
    async (context, _request, response) => {
      const trialDaysLeft = trialEndDate
        ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

      let llmTotalTokens: number | undefined;
      try {
        const client = (await context.core).elasticsearch.client;
        const result = await client.asCurrentUser.search({
          index: '.kibana-inference-token-usage',
          size: 0,
          aggs: {
            total_tokens: {
              sum: { field: 'token_usage.total_tokens' },
            },
          },
        });

        const aggs = result.aggregations as { total_tokens?: { value: number } } | undefined;
        llmTotalTokens = aggs?.total_tokens?.value ?? undefined;
      } catch {
        // data stream may not exist yet
      }

      return response.ok({
        headers: { 'content-type': 'application/json' },
        body: {
          trialDaysLeft,
          llmTotalTokens,
        },
      });
    }
  );
};
