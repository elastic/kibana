/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { Logger } from '@kbn/core/server';

import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import { searchAttacksRoute } from './search_attacks_route';
import { setAttacksAssigneesRoute } from './set_attacks_assignees_route';
import { setAttacksStatusRoute } from './set_attacks_status_route';
import { setAttacksTagsRoute } from './set_attacks_tags_route';

export const registerAttacksRoutes = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null,
  telemetrySender: ITelemetryEventsSender,
  eventBus?: SecuritySolutionEventBus,
  logger?: Logger
) => {
  searchAttacksRoute(router, telemetrySender);
  setAttacksStatusRoute(router, ruleDataClient, telemetrySender, eventBus, logger);
  setAttacksTagsRoute(router, ruleDataClient, telemetrySender, eventBus, logger);
  setAttacksAssigneesRoute(router, ruleDataClient, telemetrySender, eventBus, logger);
};
