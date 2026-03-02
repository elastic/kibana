/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ElasticAssistantRequestHandlerContext } from '../../types';

import { registerWorkflowCrudRoutes, registerWorkflowExecutionRoutes } from './workflow';
import { registerExtractEntitiesRoute } from './entities';
import {
  registerCaseObservableExtractionRoute,
  registerCaseTriggerRoutes,
  registerCaseEventNotificationRoute,
  registerCaseAttackDiscoveryRoute,
} from './cases';

/**
 * Register all alert grouping routes
 */
export const registerAlertGroupingRoutes = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  // Workflow CRUD routes
  registerWorkflowCrudRoutes(router);

  // Workflow execution routes
  registerWorkflowExecutionRoutes(router);

  // Entity extraction route
  registerExtractEntitiesRoute(router);

  // Case observable extraction route
  registerCaseObservableExtractionRoute(router);

  // Case trigger management routes
  registerCaseTriggerRoutes(router);

  // Case event notification route
  registerCaseEventNotificationRoute(router);

  // Case Attack Discovery generation route
  registerCaseAttackDiscoveryRoute(router);
};

export * from './workflow';
export * from './entities';
export * from './cases';
