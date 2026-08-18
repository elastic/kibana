/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { PndConfig } from '../config';
import type { PndSpaceIdResolver } from '../types';
import type { WatchesService } from '../services/watches/watches_service';
import { registerListWatchesRoute } from './watches/list_watches';
import { registerGetWatchRoute } from './watches/get_watch';
import { registerUpdateWatchRoute } from './watches/update_watch';
import { registerEnsureWatchScheduleRoute } from './watches/ensure_watch_schedule';
import { registerListWorkersRoute } from './workers/list_workers';
import { registerUpdateWorkerRoute } from './workers/update_worker';
import { registerListSkillsRoute } from './skills/list_skills';
import { registerUpdateSkillRoute } from './skills/update_skill';
import { registerListInvestigationsRoute } from './investigations/list_investigations';
import { registerGetInvestigationRoute } from './investigations/get_investigation';
import { registerListInvestigationProposalsRoute } from './investigations/list_proposals';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  config: PndConfig;
  getSpaceId: PndSpaceIdResolver;
  getWatchesService: () => WatchesService;
}

export const registerRoutes = (deps: RouteDependencies): void => {
  registerListWatchesRoute(deps);
  registerGetWatchRoute(deps);
  registerUpdateWatchRoute(deps);
  registerEnsureWatchScheduleRoute(deps);
  registerListWorkersRoute(deps);
  registerUpdateWorkerRoute(deps);
  registerListSkillsRoute(deps);
  registerUpdateSkillRoute(deps);
  registerListInvestigationsRoute(deps);
  registerGetInvestigationRoute(deps);
  registerListInvestigationProposalsRoute(deps);
};
