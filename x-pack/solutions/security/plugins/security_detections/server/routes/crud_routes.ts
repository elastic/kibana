/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Engine v2 — CRUD routes (step 8.6).
 *
 * Four thin route handlers over DetectionRulesClient:
 *
 *   POST   /api/detection_engine/v2/rules            create
 *   PUT    /api/detection_engine/v2/rules/{id}       replace (full update)
 *   PATCH  /api/detection_engine/v2/rules/{id}       patch   (partial update)
 *   DELETE /api/detection_engine/v2/rules/{id}       delete  (returns last state)
 *
 * Every handler:
 *   1. Awaits `context.core` for the per-request uiSettings client.
 *   2. Checks the `alerting:v2:enabled` gate (503 ALERTING_DISABLED when off).
 *   3. Acquires the framework rules client with the Security caller identity
 *      so managed-rule writes are allowed.
 *   4. Wraps it in DetectionRulesClient and delegates all semantic work there.
 *   5. Maps thrown Boom errors to the Alerting v2 error envelope.
 *
 * Routes are registered only when `enableDetectionsOnV2` is true (enforced by
 * the plugin before calling registerCrudRoutes).
 *
 * Ref: rule-crud-api.md "The endpoints", "Conventions every endpoint shares",
 *      "Create a rule", "Replace a rule with PUT", "Patch a rule with PATCH",
 *      "Delete a rule"
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';

import {
  detectionRuleCreatePropsSchema,
  detectionRuleUpdatePropsSchema,
  detectionRulePatchPropsSchema,
} from '../../common/api';
import { DetectionRulesClient } from '../detection_rules_client';
import {
  DETECTION_ENGINE_V2_RULES_PATH,
  DETECTION_ENGINE_V2_RULE_PATH,
  assertAlertingEnabled,
  toErrorResponse,
} from './detection_route_helpers';
import type { DetectionsPluginStartDeps } from './types';

// ---------------------------------------------------------------------------
// API version
// ---------------------------------------------------------------------------

const DETECTIONS_API_VERSION = '2023-10-31' as const;

// ---------------------------------------------------------------------------
// Params schema (shared by PUT, PATCH, DELETE)
// ---------------------------------------------------------------------------

const ruleIdParamsSchema = z.object({
  id: z.string().min(1).describe('The object id of the rule.'),
});

// ---------------------------------------------------------------------------
// Route: POST /rules — create a rule
// ---------------------------------------------------------------------------

/**
 * Register POST /api/detection_engine/v2/rules.
 *
 * Takes a `DetectionRuleCreateProps` union.  Applies defaults, converts to
 * framework shape, and calls `DetectionRulesClient.createRule`.
 *
 * Status codes:
 *   201  Created — the new rule.
 *   400  Public schema failure or framework builder/schedule validation.
 *   409  Duplicate `rule_id` (framework signature-id uniqueness conflict).
 *   503  `alerting:v2:enabled` is off.
 *
 * Ref: rule-crud-api.md "Create a rule"
 */
export function registerCreateRuleRoute(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  router.versioned
    .post({
      access: 'public',
      path: DETECTION_ENGINE_V2_RULES_PATH,
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
        version: DETECTIONS_API_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(detectionRuleCreatePropsSchema),
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

          const created = await client.createRule(request.body);

          return response.created({ body: created });
        } catch (e) {
          return toErrorResponse(e, response);
        }
      }
    );
}

// ---------------------------------------------------------------------------
// Route: PUT /rules/{id} — replace a rule
// ---------------------------------------------------------------------------

/**
 * Register PUT /api/detection_engine/v2/rules/{id}.
 *
 * Full replacement with v1 semantics: the payload plus defaults becomes the
 * rule's entire new user-controllable state.  Omitted defaultable fields
 * reset; omitted optional fields clear.
 *
 * Status codes:
 *   200  OK — the updated rule.
 *   400  Public schema failure or framework validation.
 *   404  Rule does not exist or is out of Detection scope.
 *   409  Payload `type` differs from the stored type (type is immutable).
 *   503  `alerting:v2:enabled` is off.
 *
 * Ref: rule-crud-api.md "Replace a rule with PUT"
 */
export function registerReplaceRuleRoute(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  router.versioned
    .put({
      access: 'public',
      path: DETECTION_ENGINE_V2_RULE_PATH,
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
        version: DETECTIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ruleIdParamsSchema),
            body: buildRouteValidationWithZod(detectionRuleUpdatePropsSchema),
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

          const updated = await client.replaceRule(request.params.id, request.body);

          return response.ok({ body: updated });
        } catch (e) {
          return toErrorResponse(e, response);
        }
      }
    );
}

// ---------------------------------------------------------------------------
// Route: PATCH /rules/{id} — patch a rule
// ---------------------------------------------------------------------------

/**
 * Register PATCH /api/detection_engine/v2/rules/{id}.
 *
 * Merges the partial payload over the stored rule.  Any field present
 * replaces the stored value; anything omitted stays.  `null` clears an
 * optional field.  The merged result is validated against the stored type's
 * full create schema, so a foreign field (e.g. `threshold` on a query rule)
 * becomes a 400 error.
 *
 * Status codes:
 *   200  OK — the updated rule.
 *   400  Public schema failure or merged-result validation failure.
 *   404  Rule does not exist or is out of Detection scope.
 *   503  `alerting:v2:enabled` is off.
 *
 * Ref: rule-crud-api.md "Patch a rule with PATCH"
 */
export function registerPatchRuleRoute(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  router.versioned
    .patch({
      access: 'public',
      path: DETECTION_ENGINE_V2_RULE_PATH,
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
        version: DETECTIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ruleIdParamsSchema),
            body: buildRouteValidationWithZod(detectionRulePatchPropsSchema),
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

          const patched = await client.patchRule(request.params.id, request.body);

          return response.ok({ body: patched });
        } catch (e) {
          return toErrorResponse(e, response);
        }
      }
    );
}

// ---------------------------------------------------------------------------
// Route: DELETE /rules/{id} — delete a rule
// ---------------------------------------------------------------------------

/**
 * Register DELETE /api/detection_engine/v2/rules/{id}.
 *
 * Reads the rule (giving the 404 and scope check), deletes it, and returns
 * the rule's last state as the response body — v1's behavior.
 *
 * Status codes:
 *   200  OK — the deleted rule's last state.
 *   404  Rule does not exist or is out of Detection scope.
 *   503  `alerting:v2:enabled` is off.
 *
 * Ref: rule-crud-api.md "Delete a rule"
 */
export function registerDeleteRuleRoute(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  router.versioned
    .delete({
      access: 'public',
      path: DETECTION_ENGINE_V2_RULE_PATH,
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
        version: DETECTIONS_API_VERSION,
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

          const deleted = await client.deleteRule(request.params.id);

          return response.ok({ body: deleted });
        } catch (e) {
          return toErrorResponse(e, response);
        }
      }
    );
}

// ---------------------------------------------------------------------------
// Barrel registration function
// ---------------------------------------------------------------------------

/**
 * Register all four CRUD routes.
 *
 * Called from the plugin's `setup` when `enableDetectionsOnV2` is true.
 *
 * @param router    - Kibana versioned HTTP router.
 * @param getStartServices - Returns start-phase services lazily inside handlers.
 * @param logger    - Plugin logger.
 */
export function registerCrudRoutes(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  registerCreateRuleRoute(router, getStartServices, logger);
  registerReplaceRuleRoute(router, getStartServices, logger);
  registerPatchRuleRoute(router, getStartServices, logger);
  registerDeleteRuleRoute(router, getStartServices, logger);
}
