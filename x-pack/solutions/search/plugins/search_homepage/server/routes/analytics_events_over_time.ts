/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import {
  ANALYTICS_EVENTS_OVER_TIME_PATH,
  MAX_ANALYTICS_EVENT_SOURCES,
} from '../../common/analytics';
import type { AnalyticsEventsOverTime } from '../../common/analytics';
import { fetchAnalyticsEventsOverTime } from '../lib/analytics_events_over_time';
import { getStatusCode } from './analytics_cluster_state';

const FAILURE_MESSAGE = 'Failed to fetch the analytics events over time';
// The longest index name and a generous bound for a field path.
const MAX_SOURCE_NAME_LENGTH = 255;
const MAX_FIELD_NAME_LENGTH = 1024;

const bodySchema = schema.object({
  sources: schema.arrayOf(
    schema.object({
      name: schema.string({ minLength: 1, maxLength: MAX_SOURCE_NAME_LENGTH }),
      timeField: schema.string({ minLength: 1, maxLength: MAX_FIELD_NAME_LENGTH }),
    }),
    { minSize: 1, maxSize: MAX_ANALYTICS_EVENT_SOURCES }
  ),
});

export const registerAnalyticsEventsOverTimeRoute = (router: IRouter, logger: Logger): void => {
  router.post(
    {
      path: ANALYTICS_EVENTS_OVER_TIME_PATH,
      validate: { body: bodySchema },
      options: { access: 'internal' },
      security: {
        authz: AuthzDisabled.fromReason(
          'Every search runs as the caller: Elasticsearch scopes the named sources and their event counts to what the caller may read'
        ),
      },
    },
    async (context, request, response) => {
      try {
        const core = await context.core;
        const body: AnalyticsEventsOverTime = await fetchAnalyticsEventsOverTime({
          client: core.elasticsearch.client,
          sources: request.body.sources,
        });

        return response.ok({ body });
      } catch (error) {
        const statusCode = getStatusCode(error);
        if (statusCode === 403) {
          logger.debug(`${FAILURE_MESSAGE}, the caller lacks privileges: ${error.message}`);
          return response.forbidden({
            body: { message: 'Insufficient privileges to read the events of these sources' },
          });
        }
        logger.error(`${FAILURE_MESSAGE}: ${error.message}`);
        return response.customError({ statusCode, body: { message: FAILURE_MESSAGE } });
      }
    }
  );
};
