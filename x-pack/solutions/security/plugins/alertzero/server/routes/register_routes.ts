/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { AlertZeroSpaceIdResolver } from '../types';
import type { WatchesService } from '../services/watches/watches_service';
import type { WorkersService } from '../services/workers/workers_service';
import type { ConversationProposalsService } from '../services/conversation_proposals/conversation_proposals_service';
import type { ActionsService } from '../services/actions/actions_service';
import { registerListWatchesRoute } from './watches/list_watches';
import { registerGetWatchRoute } from './watches/get_watch';
import { registerListWorkersRoute } from './workers/list_workers';
import { registerUpdateWorkerRoute } from './workers/update_worker';
import { registerGetProposalsByCategoryRoute } from './proposals/get_proposals_by_category';
import { registerGetClosedProposalsRoute } from './proposals/get_closed_proposals';
import { registerListActionsRoute } from './actions/list_actions';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  getSpaceId: AlertZeroSpaceIdResolver;
  getWatchesService: () => WatchesService;
  getWorkersService: () => WorkersService;
  getConversationProposalsService: () => ConversationProposalsService;
  getActionsService: () => ActionsService;
}

export const registerRoutes = (deps: RouteDependencies): void => {
  registerListWatchesRoute(deps);
  registerGetWatchRoute(deps);
  registerListWorkersRoute(deps);
  registerUpdateWorkerRoute(deps);
  registerGetProposalsByCategoryRoute(deps);
  registerGetClosedProposalsRoute(deps);
  registerListActionsRoute(deps);
};
