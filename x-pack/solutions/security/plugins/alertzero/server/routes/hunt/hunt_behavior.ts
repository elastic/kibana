/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntBehaviorResponse } from '@kbn/alertzero-common';
import {
  ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
  API_VERSIONS,
  HuntBehaviorRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_INTERNAL_ROUTE_BASE } from '../../../common/constants';
import { huntBehavior } from '../../services/watches/hunt/tier2/hunt_behavior';
import { resolveScopedModel } from './lib/scoped_model';
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
          // Provisional. This route spends LLM tokens and executes LLM-generated
          // ES|QL as the caller, so the read privilege is a placeholder until the
          // hunt workflow child (the production caller) fixes the identity it
          // runs under; revisit alongside that PR.
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
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
      async (context, request, response) => {
        try {
          const core = await context.core;
          const { getInference, getSearchInferenceEndpoints } = getHuntServices();

          // Tier 2 is one-shot extraction plus one-shot ES|QL rule drafting, which is
          // what the Reasoning tier is for. Resolving it by tier rather than by the
          // deployment default is required, not cosmetic: the tiers register with
          // `ignoreGlobalDefault: true`, so the default connector is a different model
          // than the one the operator picked in Model Settings.
          const modelOutcome = await resolveScopedModel({
            inference: getInference(),
            searchInferenceEndpoints: getSearchInferenceEndpoints(),
            featureId: ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
            request,
            uiSettingsClient: core.uiSettings.client,
            logger,
          });

          if (!modelOutcome.ok) {
            return response.customError({
              statusCode: modelOutcome.reason === 'no_inference_plugin' ? 503 : 400,
              body: {
                message: modelOutcome.message,
                attributes: {
                  tier2_skipped_reason:
                    modelOutcome.reason === 'no_inference_plugin'
                      ? 'no_inference_plugin'
                      : 'no_connector',
                },
              },
            });
          }

          const { text, report_id, llm_confidence_threshold, iocs, article_context } = request.body;
          const esClient = core.elasticsearch.client.asCurrentUser;

          const body: HuntBehaviorResponse = await huntBehavior(
            modelOutcome.model,
            logger,
            { text, report_id, llm_confidence_threshold, iocs, article_context },
            esClient
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
      }
    );
};
