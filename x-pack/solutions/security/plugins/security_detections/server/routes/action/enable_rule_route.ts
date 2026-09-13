/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POST /api/detection_engine/v2/rules/{id}/_enable
 *
 * Enables a detection rule by its object id.  The client scope-checks the rule
 * first: a missing id and a rule outside the API's scope both answer 404
 * RULE_NOT_FOUND so the API does not confirm the existence of foreign rules.
 *
 * Semantics pass through to the framework untouched:
 *   - Re-enabling an already-enabled rule is NOT short-circuited.  A redundant
 *     enable still rewrites the rule, re-ensures the executor task (self-heal),
 *     and moves `updated_at` / `updated_by`.
 *   - `revision` never moves — enable is not a meaningful rule edit.
 *   - Enable does NOT validate detection logic.  A rule with stale builder
 *     fields enables successfully and fails loudly on every scheduled run.
 *
 * Ref: rule-actions-api.md "The endpoints", "Semantics",
 *      "What enable does not check", "What is deliberately absent"
 *      rule-crud-api.md "Conventions every endpoint shares"
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type {
  CoreSetup,
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  RequestHandlerContext,
} from '@kbn/core/server';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import { DetectionRulesClient } from '../../detection_rules_client';
import {
  DETECTION_ENGINE_V2_RULES_PATH,
  assertAlertingEnabled,
  toErrorResponse,
} from '../detection_route_helpers';
import type { DetectionsPluginStartDeps } from '../types';

// ---------------------------------------------------------------------------
// Path constant
// ---------------------------------------------------------------------------

/** `POST /api/detection_engine/v2/rules/{id}/_enable` */
export const DETECTION_ENGINE_V2_RULE_ENABLE_PATH =
  `${DETECTION_ENGINE_V2_RULES_PATH}/{id}/_enable` as const;

// ---------------------------------------------------------------------------
// Path parameter schema
// ---------------------------------------------------------------------------

/** Zod schema for the `{id}` path parameter. */
const ruleIdParamsSchema = z.object({
  id: z.string().min(1).describe('The object id of the detection rule to enable.'),
});

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

/**
 * Registers `POST /api/detection_engine/v2/rules/{id}/_enable`.
 *
 * The route is thin: it checks the 503 gate, acquires the framework rules
 * client with the Security caller identity so managed-rule writes are
 * allowed, and delegates to `DetectionRulesClient.enableRule`.
 *
 * @param router - Kibana versioned HTTP router from `core.http.createRouter()`.
 * @param getStartServices - `CoreSetup.getStartServices()` from plugin setup.
 * @param logger - Plugin logger.
 */
export function registerEnableRuleRoute(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  router.versioned
    .post({
      access: 'public',
      path: DETECTION_ENGINE_V2_RULE_ENABLE_PATH,
      security: {
        authz: {
          requiredPrivileges: ['rules-all'],
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
      async (
        context: RequestHandlerContext,
        request: KibanaRequest,
        response: KibanaResponseFactory
      ) => {
        try {
          const coreCtx = await context.core;
          await assertAlertingEnabled(coreCtx.uiSettings.client);

          const [, { alertingVTwo }] = await getStartServices();
          const frameworkClient = await (
            alertingVTwo as AlertingServerStart
          ).getRulesClientWithRequest(request, { onBehalfOf: { solution: 'security' } });
          const client = new DetectionRulesClient({ frameworkClient, logger });

          const rule = await client.enableRule(
            (request.params as z.infer<typeof ruleIdParamsSchema>).id
          );
          return response.ok({ body: rule });
        } catch (e) {
          return toErrorResponse(e, response);
        }
      }
    );
}
