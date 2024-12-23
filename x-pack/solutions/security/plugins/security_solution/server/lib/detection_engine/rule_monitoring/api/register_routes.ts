/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../types';
import { getClusterHealthRoute } from './detection_engine_health/get_cluster_health/get_cluster_health_route';
import { getRuleHealthRoute } from './detection_engine_health/get_rule_health/get_rule_health_route';
import { getSpaceHealthRoute } from './detection_engine_health/get_space_health/get_space_health_route';
import { setupHealthRoute } from './detection_engine_health/setup/setup_health_route';
import { getRuleExecutionEventsRoute } from './rule_execution_logs/get_rule_execution_events/get_rule_execution_events_route';
import { getRuleExecutionResultsRoute } from './rule_execution_logs/get_rule_execution_results/get_rule_execution_results_route';

export const registerRuleMonitoringRoutes = (router: SecuritySolutionPluginRouter) => {
  // Detection Engine health API
  getClusterHealthRoute(router);
  getSpaceHealthRoute(router);
  getRuleHealthRoute(router);
  setupHealthRoute(router);

  // Rule execution logs API
  getRuleExecutionEventsRoute(router);
  getRuleExecutionResultsRoute(router);
};
