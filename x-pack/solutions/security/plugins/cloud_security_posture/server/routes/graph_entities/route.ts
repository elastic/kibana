/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  entitiesRequestSchema,
  entitiesResponseSchema,
} from '@kbn/cloud-security-posture-common/schema/graph_entities/latest';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { EntitiesRequest } from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import { GRAPH_ENTITIES_ROUTE_PATH } from '../../../common/constants';
import type { CspRequestHandlerContext, CspRouter } from '../../types';
import { getEntities } from './v1';

export const defineGraphEntitiesRoute = (router: CspRouter) =>
  router.versioned
    .post({
      access: 'internal',
      enableQueryVersion: true,
      path: GRAPH_ENTITIES_ROUTE_PATH,
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
            body: entitiesRequestSchema,
          },
          response: {
            200: { body: entitiesResponseSchema },
          },
        },
      },
      async (context: CspRequestHandlerContext, request, response) => {
        const cspContext = await context.csp;
        const { page } = request.body;
        const { entityIds, start, end, indexPatterns } = request.body
          .query as EntitiesRequest['query'];
        const spaceId = await cspContext.spacesService?.getSpaceId(request);

        try {
          const resp = await getEntities({
            services: {
              logger: cspContext.logger,
              esClient: cspContext.esClient,
            },
            query: {
              entityIds,
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
          cspContext.logger.error(`Failed to fetch entities ${err}`);
          cspContext.logger.error(err);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
