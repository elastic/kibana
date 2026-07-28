/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { PndConfig } from '../config';
import type { PndSpaceIdResolver } from '../types';
import type { WatchWorkflowProjectionService } from '../services/watches/watch_workflow_projection_service';
import type { InvestigationStore } from '../services/investigations/investigation_store';
import { registerListWatchesRoute } from './watches/list_watches';
import { registerGetWatchRoute } from './watches/get_watch';
import { registerListInvestigationsRoute } from './investigations/list_investigations';
import { registerGetInvestigationRoute } from './investigations/get_investigation';
import { registerListInvestigationProposalsRoute } from './investigations/list_proposals';
import { registerAcceptProposalRoute } from './investigations/accept_proposal';
import { registerRejectProposalRoute } from './investigations/reject_proposal';
import { registerModifyProposalRoute } from './investigations/modify_proposal';
import { registerGenerateProposalRoute } from './investigations/generate_proposal';
import { registerEmitProposalRoute } from './investigations/emit_proposal';
import { registerAssignProposalRoute } from './investigations/assign_proposal';
import { registerEnrichAlertRoute } from './investigations/enrich_alert';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  config: PndConfig;
  getSpaceId: PndSpaceIdResolver;
  getWatchProjection: () => WatchWorkflowProjectionService | undefined;
  getWorkflowsManagement: () => WorkflowsServerPluginSetup['management'] | undefined;
  getInvestigationStore: () => InvestigationStore | undefined;
}

export const registerRoutes = (deps: RouteDependencies): void => {
  registerListWatchesRoute(deps);
  registerGetWatchRoute(deps);
  registerListInvestigationsRoute(deps);
  registerGetInvestigationRoute(deps);
  registerListInvestigationProposalsRoute(deps);
  registerAcceptProposalRoute(deps);
  registerRejectProposalRoute(deps);
  registerModifyProposalRoute(deps);
  registerGenerateProposalRoute(deps);
  registerEmitProposalRoute(deps);
  registerAssignProposalRoute(deps);
  registerEnrichAlertRoute(deps);
};
