/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * GET /api/detection_engine/v2/rules/{id}
 *
 * Fetches one detection rule by its object id.  The client verifies that the
 * fetched rule is in scope (correct ownership fragment AND its builder_type
 * resolves through the alias map); out-of-scope and missing rules both answer
 * 404 RULE_NOT_FOUND so the API does not confirm the existence of foreign rules.
 *
 * Ref: rule-fetch-api.md "One rule by object id"
 *      rule-crud-api.md "Conventions every endpoint shares"
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import { DetectionRulesClient } from '../../detection_rules_client';
import {
  DETECTION_ENGINE_V2_RULE_PATH,
  assertAlertingEnabled,
  toErrorResponse,
} from '../detection_route_helpers';
import type { DetectionsPluginStartDeps } from '../types';

/** Path parameter schema for a single rule. */
const ruleIdParamsSchema = z.object({
  id: z.string().min(1).describe('The object id of the rule.'),
});

/**
 * Registers `GET /api/detection_engine/v2/rules/{id}`.
 *
 * @param router - Kibana versioned HTTP router.
 * @param getStartServices - Returns start-phase services lazily inside handlers.
 * @param logger - Plugin logger.
 */
export function registerGetRuleRoute(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  router.versioned
    .get({
      access: 'public',
      path: DETECTION_ENGINE_V2_RULE_PATH,
      security: {
        authz: {
          requiredPrivileges: ['rules-read'],
        },
      },
      options: {
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: buildRouteValidationWithZod(ruleIdParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        try {
          const coreCtx = await context.core;
          await assertAlertingEnabled(coreCtx.uiSettings.client);

          const [, { alertingVTwo }] = await getStartServices();
          const frameworkClient = await (
            alertingVTwo as AlertingServerStart
          ).getRulesClientWithRequest(request, { onBehalfOf: { solution: 'security' } });
          const client = new DetectionRulesClient({ frameworkClient, logger });

          const rule = await client.getRule(request.params.id);
          return response.ok({ body: rule });
        } catch (e) {
          return toErrorResponse(e, response);
        }
      }
    );
}
