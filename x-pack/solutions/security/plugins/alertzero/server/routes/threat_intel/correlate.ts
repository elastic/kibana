/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  CorrelateRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_INTERNAL_ROUTE_BASE } from '../../../common/constants';
import { runCorrelationEngine } from '../../services/watches/hunt/correlation/correlation_engine';
import type { RouteDependencies } from '../register_routes';

export const CORRELATE_URL = `${HUNT_INTERNAL_ROUTE_BASE}/correlate` as const;

export const registerCorrelateRoute = ({ router, logger, getSpaceId }: RouteDependencies): void => {
  router.versioned
    .post({
      path: CORRELATE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'Run E7 anchor correlation engine against the threat-reports data stream',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(CorrelateRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const spaceId = getSpaceId(request);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const { source_report_id, anchors, size } = request.body;

          const result = await runCorrelationEngine(
            esClient,
            logger,
            spaceId,
            { source_report_id, anchors, size }
          );

          // Strip the toAttachmentData helper before serialising to JSON.
          const { toAttachmentData: _fn, ...body } = result;
          return response.ok({ body });
        } catch (err) {
          logger.error(`correlate route failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Correlation engine failed: ${(err as Error).message}` },
          });
        }
      }
    );
};
