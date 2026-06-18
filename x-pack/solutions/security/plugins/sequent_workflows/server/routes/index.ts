/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import { registerRunWorkflowRoute } from './run_workflow';
import { registerRunWorkflowV2Route } from './run_workflow_v2';
import { registerGetExecutionRoute } from './get_execution';

export const defineRoutes = (router: IRouter, core: CoreSetup, logger: Logger): void => {
  registerRunWorkflowRoute(router, core, logger);
  registerRunWorkflowV2Route(router, core, logger);
  registerGetExecutionRoute(router, core, logger);
};
