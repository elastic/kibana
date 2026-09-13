/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * GET /api/detection_engine/v2/tags
 *
 * Returns the distinct tags across the caller's detection rules for the tags
 * filter dropdown. Response shape: { tags: string[] }.
 *
 * Aggregation is scoped to detection rules only via the ownership fragment
 * inside `DetectionRulesClient.getDetectionTags()`.
 *
 * Ref: rule-fetch-api.md "The tags endpoint"
 *      rule-crud-api.md "Conventions every endpoint shares"
 */

import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import { DetectionRulesClient } from '../../detection_rules_client';
import {
  DETECTION_ENGINE_V2_TAGS_PATH,
  assertAlertingEnabled,
  toErrorResponse,
} from '../detection_route_helpers';
import type { DetectionsPluginStartDeps } from '../types';

/**
 * Registers `GET /api/detection_engine/v2/tags`.
 *
 * @param router - Kibana versioned HTTP router.
 * @param getStartServices - Returns start-phase services lazily inside handlers.
 * @param logger - Plugin logger.
 */
export function registerGetTagsRoute(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  router.versioned
    .get({
      access: 'public',
      path: DETECTION_ENGINE_V2_TAGS_PATH,
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
        validate: false,
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

          const tags = await client.getDetectionTags();
          return response.ok({ body: { tags } });
        } catch (e) {
          return toErrorResponse(e, response);
        }
      }
    );
}
