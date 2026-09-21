/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  HuntCoordinatorRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { randomUUID } from 'crypto';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_INTERNAL_ROUTE_BASE } from '../../../common/constants';
import { huntCoordinator } from '../../services/watches/hunt/hunt_coordinator';
import { resolveScopedModel } from './lib/scoped_model';
import type { RouteDependencies } from '../register_routes';

export const HUNT_COORDINATOR_URL = `${HUNT_INTERNAL_ROUTE_BASE}/hunt_coordinator` as const;

/**
 * Runs the two-tier hunt pipeline (Tier 1 + optional Tier 2) for a single report.
 * The coordinator does NOT write feedback — `completedSuccessfully` on the result
 * tells the caller whether the managed-workflow feedback step should proceed.
 */
export const registerHuntCoordinatorRoute = ({
  router,
  logger,
  getSpaceId,
  getHuntServices,
}: RouteDependencies): void => {
  router.versioned
    .post({
      path: HUNT_COORDINATOR_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'Run the two-tier hunt coordinator for a report',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(HuntCoordinatorRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const core = await context.core;
          const spaceId = getSpaceId(request);
          const esClient = core.elasticsearch.client.asCurrentUser;
          const { getInference } = getHuntServices();

          const modelOutcome = await resolveScopedModel({
            inference: getInference(),
            request,
            uiSettingsClient: core.uiSettings.client,
            logger,
          });

          const model = modelOutcome.ok ? modelOutcome.model : undefined;

          const {
            report_id,
            text,
            iocs,
            techniques,
            time_range,
            size,
            max_assets,
            llm_confidence_threshold,
            tier2_when,
            max_tier2_sample_events,
            trigger,
          } = request.body;

          const result = await huntCoordinator(esClient, model, logger, {
            report_id,
            spaceId,
            text,
            iocs,
            techniques,
            time_range,
            size,
            max_assets,
            llm_confidence_threshold,
            tier2_when,
            max_tier2_sample_events,
            trigger,
            runId: randomUUID(),
          });

          return response.ok({ body: result });
        } catch (err) {
          logger.error(`hunt_coordinator route failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Hunt coordinator failed: ${(err as Error).message}` },
          });
        }
      }
    );
};
