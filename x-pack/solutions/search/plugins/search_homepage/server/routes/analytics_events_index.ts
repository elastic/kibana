/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boundedString, schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import {
  ANALYTICS_EVENTS_INDEX_PATH,
  MAX_EVENTS_INDEX_NAME_BYTES,
  getEventsIndexNameProblem,
} from '../../common/analytics_events_index';
import type { AnalyticsEventsIndexCreateResult } from '../../common/analytics_events_index';
import { EventsIndexCreateError, createEventsIndex } from '../lib/analytics_events_index';
import { getStatusCode } from './analytics_cluster_state';

const FAILURE_MESSAGE = 'Failed to create the events index';

const bodySchema = schema.object({
  name: boundedString({
    minLength: 1,
    maxLength: MAX_EVENTS_INDEX_NAME_BYTES,
    validate: (name) => {
      const problem = getEventsIndexNameProblem(name);
      return problem === undefined ? undefined : `is not a valid index name (${problem})`;
    },
  }),
});

/** Creates an empty index in columnar mode for the caller's events, with the caller's own privileges. */
export const registerAnalyticsEventsIndexRoute = (router: IRouter, logger: Logger): void => {
  router.post(
    {
      path: ANALYTICS_EVENTS_INDEX_PATH,
      validate: { body: bodySchema },
      options: { access: 'internal' },
      security: {
        authz: AuthzDisabled.fromReason(
          'The index is created as the caller: Elasticsearch decides whether they may create it'
        ),
      },
    },
    async (context, request, response) => {
      const { name } = request.body;
      try {
        const { elasticsearch } = await context.core;
        const body: AnalyticsEventsIndexCreateResult = await createEventsIndex({
          client: elasticsearch.client,
          name,
        });

        return response.ok({ body });
      } catch (error) {
        if (error instanceof EventsIndexCreateError) {
          const { statusCode, message } = error;
          return statusCode === 409
            ? response.conflict({ body: { message } })
            : response.badRequest({ body: { message } });
        }
        const statusCode = getStatusCode(error);
        if (statusCode === 403) {
          logger.debug(`${FAILURE_MESSAGE}, the caller lacks privileges: ${error.message}`);
          return response.forbidden({
            body: {
              message: `${FAILURE_MESSAGE}: your role needs the create_index index privilege on ${name}`,
            },
          });
        }
        logger.error(`${FAILURE_MESSAGE}: ${error.message}`);
        return response.customError({ statusCode, body: { message: FAILURE_MESSAGE } });
      }
    }
  );
};
