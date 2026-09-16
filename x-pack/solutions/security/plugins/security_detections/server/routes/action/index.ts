/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Barrel that registers all Detection Engine v2 action routes.
 *
 * Routes:
 *   POST /api/detection_engine/v2/rules/{id}/_enable
 *   POST /api/detection_engine/v2/rules/{id}/_disable
 *
 * Ref: rule-actions-api.md "The endpoints"
 */

import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { DetectionsPluginStartDeps } from '../types';
import { registerEnableRuleRoute } from './enable_rule_route';
import { registerDisableRuleRoute } from './disable_rule_route';

/**
 * Registers the enable and disable action routes on the provided router.
 * Called from the plugin's `setup` when the `enableDetectionsOnV2` flag is on.
 *
 * @param router - Kibana versioned HTTP router.
 * @param getStartServices - Returns start-phase services lazily inside handlers.
 * @param logger - Plugin logger.
 */
export function registerDetectionActionRoutes(
  router: IRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<DetectionsPluginStartDeps>['getStartServices'],
  logger: Logger
): void {
  registerEnableRuleRoute(router, getStartServices, logger);
  registerDisableRuleRoute(router, getStartServices, logger);
}
