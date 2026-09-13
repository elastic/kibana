/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * GET /api/detection_engine/v2/rules
 *
 * Lists detection rules with structured filter, sort, and pagination parameters.
 * Response shape: { page, per_page, total, data }.
 *
 * All parameters are optional.  Array-valued parameters are accepted as either
 * a single query value or as repeated query values (e.g. `?type=query&type=threshold`).
 * The `sort_field` parameter accepts only `name`, `enabled`, and `risk_score`; a
 * caller that passes `severity` receives 400 because lexicographic ordering is
 * wrong and the API does not substitute a `risk_score` sort silently.
 *
 * Ref: rule-fetch-api.md "The list endpoint", "Filtering", "Searching and
 *      sorting", "Pagination and the response shape", "Field limitation"
 *      rule-crud-api.md "Conventions every endpoint shares"
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import { DetectionRulesClient } from '../../detection_rules_client';
import {
  DETECTION_ENGINE_V2_RULES_PATH,
  assertAlertingEnabled,
  detectionOnRequestValidationError,
  toErrorResponse,
} from '../detection_route_helpers';
import type { DetectionsPluginStartDeps } from '../types';

// ---------------------------------------------------------------------------
// Query schema
// ---------------------------------------------------------------------------

/**
 * Helper: coerce an HTTP query string into a number, then validate as integer.
 * Mirrors `queryIntSchema` from `@kbn/alerting-v2-schemas/src/common.ts`.
 */
const queryIntSchema = ({ min, max }: { min: number; max: number }) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
    z.number().int().min(min).max(max)
  );

/**
 * Helper: accept a single value OR an array of the same item type, normalising
 * always to `T[]`. Mirrors `arrayOrSingleSchema` from
 * `@kbn/alerting-v2-schemas/src/common.ts`.
 */
const arrayOrSingleSchema = <T extends z.ZodType>(item: T, max: number) =>
  z
    .union([item, z.array(item).min(1).max(max)])
    .transform((value): Array<z.output<T>> => (Array.isArray(value) ? value : [value]));

/**
 * Query parameter schema for `GET /rules`.
 *
 * All fields are optional.  Default values (`page: 1`, `per_page: 20`) are
 * applied by the client's `listRules` method — the route schema does not carry
 * defaults so the handler can distinguish "not supplied" from "supplied as default".
 *
 * `sort_field: severity` is deliberately absent from the enum; callers that
 * send it will receive a Zod validation error → 400.
 *
 * Ref: rule-fetch-api.md "The list endpoint" (parameter table)
 */
export const listRulesQuerySchema = z.object({
  /** Filter on rule enabled/disabled state. */
  enabled: z
    .preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean())
    .optional()
    .describe('Filter on enabled/disabled state.'),

  /** Filter on public type alias (query | threshold). */
  type: arrayOrSingleSchema(z.enum(['query', 'threshold']), 100)
    .optional()
    .describe('Filter on rule type.'),

  /** Filter on severity level. */
  severity: arrayOrSingleSchema(z.enum(['low', 'medium', 'high', 'critical']), 100)
    .optional()
    .describe('Filter on severity.'),

  /** Filter on tags. */
  tags: arrayOrSingleSchema(z.string().min(1).max(1000), 100)
    .optional()
    .describe('Filter on tags.'),

  /** Filter on signature ids (the stable public rule id). */
  rule_ids: arrayOrSingleSchema(z.string().min(1).max(500), 10000)
    .optional()
    .describe('Filter on signature ids.'),

  /** Prefix-match over rule names and descriptions. */
  search: z.string().optional().describe('Prefix search over rule names and descriptions.'),

  /**
   * Sort field. `severity` is NOT accepted — lexicographic ordering is wrong
   * and the API does not silently substitute `risk_score`.
   *
   * Ref: rule-fetch-api.md "Searching and sorting"
   */
  sort_field: z
    .enum(['name', 'enabled', 'risk_score'])
    .optional()
    .describe('Sort field. Accepts name, enabled, or risk_score.'),

  /** Sort direction. */
  sort_order: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),

  /** Page number, minimum 1. */
  page: queryIntSchema({ min: 1, max: Number.MAX_SAFE_INTEGER })
    .optional()
    .describe('Page number (1-based). Defaults to 1.'),

  /**
   * Page size. Default 20, capped at 1000.
   *
   * Ref: rule-fetch-api.md "Pagination and the response shape"
   */
  per_page: queryIntSchema({ min: 1, max: 1000 })
    .optional()
    .describe('Page size. Default 20, max 1000.'),

  /**
   * Public field names to project.  Applied in the API layer after conversion;
   * `id` is always included regardless.
   *
   * Ref: rule-fetch-api.md "Field limitation"
   */
  fields: arrayOrSingleSchema(z.string().min(1).max(500), 500)
    .optional()
    .describe('Fields to return. id is always included.'),
});

export type ListRulesQuery = z.infer<typeof listRulesQuerySchema>;

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

/**
 * Registers `GET /api/detection_engine/v2/rules`.
 *
 * @param router - Kibana versioned HTTP router.
 * @param getStartServices - Returns start-phase services lazily inside handlers.
 * @param logger - Plugin logger.
 */
export function registerListRulesRoute(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  router.versioned
    .get({
      access: 'public',
      path: DETECTION_ENGINE_V2_RULES_PATH,
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
            query: buildRouteValidationWithZod(listRulesQuerySchema),
          },
          onRequestValidationError: detectionOnRequestValidationError,
        },
      },
      async (context, request, response) => {
        try {
          const coreCtx = await context.core;
          await assertAlertingEnabled(coreCtx.uiSettings.globalClient);

          const [, { alertingVTwo }] = await getStartServices();
          const frameworkClient = await (
            alertingVTwo as AlertingServerStart
          ).getRulesClientWithRequest(request, { onBehalfOf: { solution: 'security' } });
          const client = new DetectionRulesClient({ frameworkClient, logger });

          const query = request.query as ListRulesQuery;
          const result = await client.listRules({
            enabled: query.enabled,
            type: query.type,
            severity: query.severity,
            tags: query.tags,
            rule_ids: query.rule_ids,
            search: query.search,
            sort_field: query.sort_field,
            sort_order: query.sort_order,
            page: query.page ?? 1,
            per_page: query.per_page ?? 20,
            fields: query.fields,
          });

          return response.ok({ body: result });
        } catch (e) {
          return toErrorResponse(e, response);
        }
      }
    );
}
