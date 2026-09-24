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
import { parseTechnologyInput } from '../../services/watches/hunt/common/resolve_index_scope';
import { resolveScopedModel } from './lib/scoped_model';
import type { RouteDependencies } from '../register_routes';

export const HUNT_COORDINATOR_URL = `${HUNT_INTERNAL_ROUTE_BASE}/hunt_coordinator` as const;

/**
 * Runs the two-tier hunt pipeline (Tier 1 + optional Tier 2) for a single report.
 * The coordinator does NOT write feedback — `completed_successfully` on the result
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
          // Provisional. Tier 2 spends LLM tokens and executes LLM-generated ES|QL
          // as the caller, so the read privilege is a placeholder until the hunt
          // workflow child (the production caller) fixes the identity it runs
          // under; revisit alongside that PR.
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
          // Telemetry, alerts, and ES|QL run as the calling user so their index
          // privileges apply. The reports index is plugin-owned and hidden, and Kibana
          // feature privileges grant no Elasticsearch privileges on it, so it is read
          // with the internal user and scoped by the explicit space filter.
          const esClient = core.elasticsearch.client.asCurrentUser;
          const reportsEsClient = core.elasticsearch.client.asInternalUser;
          const { getInference, getSearchInferenceEndpoints } = getHuntServices();

          const technologyInput = parseTechnologyInput(request.body.technology);
          if ('invalid' in technologyInput) {
            return response.badRequest({
              body: { message: `Unknown technology "${technologyInput.invalid}".` },
            });
          }

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
            run_id,
          } = request.body;

          // Same Reasoning tier as the standalone hunt_behavior route, so this path (the
          // one that actually runs Tier 2 in production) resolves the same model. A
          // `never` run has no use for a model, so it skips resolution entirely.
          const modelOutcome =
            tier2_when === 'never'
              ? undefined
              : await resolveScopedModel({
                  inference: getInference(),
                  searchInferenceEndpoints: getSearchInferenceEndpoints(),
                  featureId: ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
                  request,
                  uiSettingsClient: core.uiSettings.client,
                  logger,
                });
          const model = modelOutcome?.ok ? modelOutcome.model : undefined;

          const body: HuntCoordinatorResponse = await huntCoordinator(
            { esClient, reportsEsClient },
            model,
            logger,
            {
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
              technology: technologyInput.technology,
              // The Worker fan-out supplies a run id so one sweep's children share it,
              // which is what the packaging barrier and conclusion dedupe key off. Only
              // mint one when the caller has no sweep to tie the run to.
              run_id: run_id ?? randomUUID(),
            }
          );

          return response.ok({ body });
        } catch (err) {
          logger.error(`hunt_coordinator route failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Hunt coordinator failed' },
          });
        }
      }
    );
};
