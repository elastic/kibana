/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Barrel that registers all Detection Engine v2 fetch routes.
 *
 * Routes:
 *   GET /api/detection_engine/v2/rules/{id}
 *   GET /api/detection_engine/v2/rules
 *   GET /api/detection_engine/v2/tags
 *
 * Ref: rule-fetch-api.md "The endpoints"
 */

import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { DetectionsPluginStartDeps } from '../types';
import { registerGetRuleRoute } from './get_rule_route';
import { registerListRulesRoute } from './list_rules_route';
import { registerGetTagsRoute } from './get_tags_route';

/**
 * Registers the three fetch routes on the provided router.
 * Called from the plugin's `setup` when the `enableDetectionsOnV2` flag is on.
 *
 * @param router - Kibana versioned HTTP router.
 * @param getStartServices - Returns start-phase services lazily inside handlers.
 * @param logger - Plugin logger.
 */
export function registerDetectionFetchRoutes(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  registerGetRuleRoute(router, getStartServices, logger);
  registerListRulesRoute(router, getStartServices, logger);
  registerGetTagsRoute(router, getStartServices, logger);
}
