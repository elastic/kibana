/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntCoordinatorResponse } from '@kbn/alertzero-common';
import {
  ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
  API_VERSIONS,
  HuntCoordinatorRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { randomUUID } from 'crypto';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_INTERNAL_ROUTE_BASE } from '../../../common/constants';
import { huntCoordinator } from '../../services/watches/hunt/hunt_coordinator';
import { buildSseData } from '../../services/watches/hunt/common/sse_mapper';
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
          const { getInference, getSearchInferenceEndpoints } = getHuntServices();

          // Same Reasoning tier as the standalone Tier 2 route: this is the path that
          // actually runs Tier 2 in production, so it must not resolve a different
          // model than a direct hunt_behavior call would.
          const modelOutcome = await resolveScopedModel({
            inference: getInference(),
            searchInferenceEndpoints: getSearchInferenceEndpoints(),
            featureId: ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
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
            runId,
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
            // The Worker fan-out supplies a run id so one sweep's children share it,
            // which is what the packaging barrier and conclusion dedupe key off. Only
            // mint one when the caller has no sweep to tie the run to.
            runId: runId ?? randomUUID(),
          });

          const sse =
            result.tier1.hasConfirmedHit && report_id
              ? buildSseData(result, report_id, { spaceId })
              : undefined;

          const body: HuntCoordinatorResponse = sse
            ? { ...result, sse: sse as unknown as HuntCoordinatorResponse['sse'] }
            : result;
          return response.ok({ body });
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
