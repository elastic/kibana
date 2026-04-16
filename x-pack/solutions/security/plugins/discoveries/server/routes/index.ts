/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, IRouter, Logger, CoreStart } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { DiscoveriesPluginStartDeps } from '../types';
import { registerDeleteScheduleRoute } from './delete/schedules/delete_schedule';
import { registerGenerateRoute } from './generate/post_generate';
import { registerGetDefaultEsqlQueryRoute } from './get/default_esql_query/get_default_esql_query';
import { registerGetExecutionTrackingRoute } from './get/execution_tracking/get_execution_tracking';
import { registerFindSchedulesRoute } from './get/schedules/find_schedules';
import { registerGetScheduleRoute } from './get/schedules/get_schedule';
import { registerGetPipelineDataRoute } from './get/pipeline_data/get_pipeline_data';
import type { WorkflowInitializationService } from '../lib/workflow_initialization';
import { registerGenerateWorkflowRoute } from './post/generate_workflow/post_generate_workflow';
import { registerCreateScheduleRoute } from './post/schedules/create_schedule';
import { registerDisableScheduleRoute } from './post/schedules/disable_schedule';
import { registerEnableScheduleRoute } from './post/schedules/enable_schedule';
import { registerValidateRoute } from './post/validate/post_validate';
import { registerUpdateScheduleRoute } from './put/schedules/update_schedule';

export const registerRoutes = (
  router: IRouter,
  logger: Logger,
  {
    adhocAttackDiscoveryDataClient,
    analytics,
    getEventLogIndex,
    getEventLogger,
    getStartServices,
    workflowInitService,
    workflowsManagementApi,
  }: {
    adhocAttackDiscoveryDataClient: IRuleDataClient;
    analytics: AnalyticsServiceSetup;
    getEventLogIndex: () => Promise<string>;
    getEventLogger: () => Promise<IEventLogger>;
    getStartServices: () => Promise<{
      coreStart: CoreStart;
      pluginsStart: DiscoveriesPluginStartDeps;
    }>;
    workflowInitService: WorkflowInitializationService;
    workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  }
) => {
  registerGenerateRoute(router, logger, {
    analytics,
    getEventLogIndex,
    getEventLogger,
    getStartServices,
    workflowInitService,
    workflowsManagementApi,
  });
  registerGetDefaultEsqlQueryRoute(router, logger, {
    getStartServices,
  });
  registerGetExecutionTrackingRoute(router, logger, {
    getEventLogIndex,
    getStartServices,
  });
  registerGetPipelineDataRoute(router, logger, {
    getEventLogIndex,
    getStartServices,
    workflowInitService,
    workflowsManagementApi,
  });
  registerGenerateWorkflowRoute(router, logger, {
    getStartServices,
    workflowInitService,
    workflowsManagementApi,
  });
  registerValidateRoute(router, logger, {
    adhocAttackDiscoveryDataClient,
    getStartServices,
    workflowInitService,
  });

  // Schedule routes
  registerCreateScheduleRoute(router, logger, {
    analytics,
    getStartServices,
  });
  registerDeleteScheduleRoute(router, logger, {
    analytics,
    getStartServices,
  });
  registerDisableScheduleRoute(router, logger, {
    analytics,
    getStartServices,
  });
  registerEnableScheduleRoute(router, logger, {
    analytics,
    getStartServices,
  });
  registerFindSchedulesRoute(router, logger, {
    getStartServices,
  });
  registerGetScheduleRoute(router, logger, {
    getStartServices,
  });
  registerUpdateScheduleRoute(router, logger, {
    analytics,
    getStartServices,
  });
};
