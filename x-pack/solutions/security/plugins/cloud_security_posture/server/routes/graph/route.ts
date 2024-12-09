/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  graphRequestSchema,
  graphResponseSchema,
} from '@kbn/cloud-security-posture-common/schema/graph/latest';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { GraphRequest } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { GRAPH_ROUTE_PATH } from '../../../common/constants';
import { CspRouter } from '../../types';
import { getGraph as getGraphV1 } from './v1';

export const defineGraphRoute = (router: CspRouter) =>
  router.versioned
    .post({
      access: 'internal',
      enableQueryVersion: true,
      path: GRAPH_ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: ['cloud-security-posture-read'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: graphRequestSchema,
          },
          response: {
            200: { body: graphResponseSchema },
          },
        },
      },
      async (context, request, response) => {
        const { nodesLimit, showUnknownTarget = false } = request.body;
        const { eventIds, start, end, esQuery } = request.body.query as GraphRequest['query'];
        const cspContext = await context.csp;
        const spaceId = (await cspContext.spaces?.spacesService?.getActiveSpace(request))?.id;

        try {
          const resp = await getGraphV1({
            services: {
              logger: cspContext.logger,
              esClient: cspContext.esClient,
            },
            query: {
              eventIds,
              spaceId,
              start,
              end,
              esQuery,
            },
            showUnknownTarget,
            nodesLimit,
          });

          return response.ok({ body: resp });
        } catch (err) {
          const error = transformError(err);
          cspContext.logger.error(`Failed to fetch graph ${err}`);
          cspContext.logger.error(err);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
