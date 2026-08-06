/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { PndConfig } from '../config';
import type { PndSpaceIdResolver } from '../types';
import type { WatchWorkflowProjectionService } from '../services/watches/watch_workflow_projection_service';
import { registerListWatchesRoute } from './watches/list_watches';
import { registerGetWatchRoute } from './watches/get_watch';
import { registerUpdateWatchRoute } from './watches/update_watch';
import { registerApplyWatchUpdateRoute } from './watches/apply_watch_update';
import { registerListInvestigationsRoute } from './investigations/list_investigations';
import { registerGetInvestigationRoute } from './investigations/get_investigation';
import { registerListInvestigationProposalsRoute } from './investigations/list_proposals';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  config: PndConfig;
  getSpaceId: PndSpaceIdResolver;
  getWatchProjection: () => WatchWorkflowProjectionService | undefined;
}

export const registerRoutes = (deps: RouteDependencies): void => {
  registerListWatchesRoute(deps);
  registerGetWatchRoute(deps);
  registerUpdateWatchRoute(deps);
  registerApplyWatchUpdateRoute(deps);
  registerListInvestigationsRoute(deps);
  registerGetInvestigationRoute(deps);
  registerListInvestigationProposalsRoute(deps);
};
