/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntBehaviorResponse } from '@kbn/alertzero-common';
import {
  ALERTZERO_HUNT_TIER2_TELEMETRY_PLUGIN_ID,
  API_VERSIONS,
  HuntBehaviorRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_WRITE, HUNT_INTERNAL_ROUTE_BASE } from '../../../common/constants';
import { huntBehavior } from '../../services/watches/hunt/tier2/hunt_behavior';
import { TIER2_MODEL_TIERS } from '../../services/watches/hunt/common/hunt_model_tiers';
import { selectHuntCallModel } from '../../services/watches/hunt/common/select_hunt_call_model';
import { mostSevereFailure, resolveHuntModels } from './lib/hunt_models';
import { resolveHuntUniverse } from './resolve_hunt_universe';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';
import type { RouteDependencies } from '../register_routes';

export const HUNT_BEHAVIOR_URL = `${HUNT_INTERNAL_ROUTE_BASE}/hunt_behavior` as const;

/**
 * Runs Tier 2's LLM-backed behavioral extraction against report text.
 * Returns 503 when the inference plugin is not installed, or 400 when no
 * connector is configured.
 */
export const registerHuntBehaviorRoute = ({
  router,
  logger,
  getHuntServices,
}: RouteDependencies): void => {
  router.versioned
    .post({
      path: HUNT_BEHAVIOR_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          // Spends LLM tokens and can execute LLM-generated ES|QL as the caller.
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Run Tier 2 behavioral corroboration against a threat report',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(HuntBehaviorRequestBody),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        try {
          const core = await context.core;
          const { getInference, getSearchInferenceEndpoints, mitreDataClient } = getHuntServices();

          // Resolved by tier, not the deployment default — see resolveScopedModel's doc for
          // why that distinction matters. Extraction prefers a saved cyber-domain model.
          // ES|QL generation keeps Frontier when that model requires a prompt template,
          // so a missing Frontier model still fails the request in that case.
          const { models, failures } = await resolveHuntModels({
            inference: getInference(),
            searchInferenceEndpoints: getSearchInferenceEndpoints(),
            telemetryPluginId: ALERTZERO_HUNT_TIER2_TELEMETRY_PLUGIN_ID,
            request,
            uiSettingsClient: core.uiSettings.client,
            logger,
            tiers: TIER2_MODEL_TIERS,
          });
          const extraction = selectHuntCallModel({
            tierModel: models.frontier,
            cyberModel: models.cyber,
          });
          const esql = selectHuntCallModel({
            tierModel: models.frontier,
            cyberModel: models.cyber,
            messagesOnly: true,
          });

          if (!extraction || !esql) {
            const failure = mostSevereFailure(failures);
            return response.customError({
              // A resolution that threw is ours to fix, not a missing connector the caller can add.
              statusCode:
                failure.reason === 'no_inference_plugin'
                  ? 503
                  : failure.reason === 'resolution_error'
                  ? 500
                  : 400,
              body: {
                message: failure.message,
                attributes: {
                  tier2_skipped_reason: failure.reason,
                  unavailable_model_tiers: failures.map(({ tier }) => tier),
                },
              },
            });
          }

          const {
            text,
            report_id,
            llm_confidence_threshold,
            iocs,
            excluded_iocs,
            article_context,
          } = request.body;
          const esClient = core.elasticsearch.client.asCurrentUser;
          // What the generated query may read: the same default data view Tier 1 searches.
          const indexPatterns = await resolveHuntUniverse(context, logger);

          const body: HuntBehaviorResponse = await huntBehavior(
            { extraction, esql },
            logger,
            {
              text,
              report_id,
              llm_confidence_threshold,
              iocs,
              ...(excluded_iocs !== undefined ? { excluded_iocs } : {}),
              article_context,
              allowed_indices: indexPatterns,
            },
            esClient,
            mitreDataClient
          );

          return response.ok({ body });
        } catch (err) {
          logger.warn(`hunt_behavior route failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message:
                'LLM extraction failed. Verify a GenAI connector is configured for this deployment.',
            },
          });
        }
      })
    );
};
