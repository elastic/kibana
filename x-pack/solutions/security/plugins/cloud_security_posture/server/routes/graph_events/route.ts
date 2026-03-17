/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  eventsRequestSchema,
  eventsResponseSchema,
} from '@kbn/cloud-security-posture-common/schema/graph_events/latest';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { EventsRequest } from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import { GRAPH_EVENTS_ROUTE_PATH } from '../../../common/constants';
import type { CspRequestHandlerContext, CspRouter } from '../../types';
import { getEvents } from './v1';

export const defineGraphEventsRoute = (router: CspRouter) =>
  router.versioned
    .post({
      access: 'internal',
      enableQueryVersion: true,
      path: GRAPH_EVENTS_ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: eventsRequestSchema,
          },
          response: {
            200: { body: eventsResponseSchema },
          },
        },
      },
      async (context: CspRequestHandlerContext, request, response) => {
        const cspContext = await context.csp;
        const { page } = request.body;
        const { eventIds, start, end, indexPatterns } = request.body
          .query as EventsRequest['query'];
        const spaceId = await cspContext.spacesService?.getSpaceId(request);

        try {
          const resp = await getEvents({
            services: {
              logger: cspContext.logger,
              esClient: cspContext.esClient,
            },
            query: {
              eventIds,
              start,
              end,
              indexPatterns,
            },
            spaceId,
            page,
          });

          return response.ok({ body: resp });
        } catch (err) {
          const error = transformError(err);
          cspContext.logger.error(`Failed to fetch events ${err}`);
          cspContext.logger.error(err);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
