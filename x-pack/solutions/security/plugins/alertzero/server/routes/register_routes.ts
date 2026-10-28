/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient, Logger } from '@kbn/core/server';
import type { AttachmentsStart, ConversationsStart } from '@kbn/agent-builder-server';
import type { AlertZeroRouter, AlertZeroSpaceIdResolver } from '../types';
import type { WatchWorkflowsManagementClient } from '../services/watches/watch_workflows_management_client';
import type { WatchesService } from '../services/watches/watches_service';
import type { WorkersService } from '../services/workers/workers_service';
import type { ConversationProposalsService } from '../services/conversation_proposals/conversation_proposals_service';
import type { ActionsService } from '../services/actions/actions_service';
import type { HuntServices } from '../services/watches/hunt';
import type { ScanFailuresService } from '../services/scan_failures/scan_failures_service';
import type { ThreatIntelSupplyService } from '../services/threat_intel_supply';
import type { AlertZeroTelemetryReporter } from '../telemetry';
import { registerListWatchesRoute } from './watches/list_watches';
import { registerGetWatchRoute } from './watches/get_watch';
import { registerListWorkersRoute } from './workers/list_workers';
import { registerUpdateWorkerRoute } from './workers/update_worker';
import { registerGetProposalsByCategoryRoute } from './proposals/get_proposals_by_category';
import { registerGetClosedProposalsRoute } from './proposals/get_closed_proposals';
import { registerListActionsRoute } from './actions/list_actions';
import { registerGetInvestigationsCountRoute } from './investigations/get_investigations_count';
import { registerGetScanFailuresRoute } from './scan_failures/get_scan_failures';
import { registerHuntRoutes } from './hunt/register_hunt_routes';

export interface RouteDependencies {
  router: AlertZeroRouter;
  logger: Logger;
  getSpaceId: AlertZeroSpaceIdResolver;
  /** The deployment cluster client from core start; routes scope it per request. */
  getClusterClient: () => IClusterClient;
  getWatchesService: () => WatchesService;
  getWorkersService: () => WorkersService;
  getConversationProposalsService: () => ConversationProposalsService;
  getActionsService: () => ActionsService;
  getAgentBuilderConversations: () => ConversationsStart;
  getAgentBuilderAttachments: () => AttachmentsStart;
  getHuntServices: () => HuntServices;
  getScanFailuresService: () => ScanFailuresService;
  getThreatIntelSupplyService: () => ThreatIntelSupplyService | undefined;
  /** True on Serverless, where built-in worker roles carry a `_` prefix. */
  isServerless: boolean;
  /** The workflows management client; undefined when workflows management is unavailable. */
  getWorkflowsManagement: () => WatchWorkflowsManagementClient | undefined;
  /** Reports an AlertZero telemetry event; never throws. */
  reportTelemetryEvent: AlertZeroTelemetryReporter;
}

export const registerRoutes = (deps: RouteDependencies): void => {
  registerListWatchesRoute(deps);
  registerGetWatchRoute(deps);
  registerListWorkersRoute(deps);
  registerUpdateWorkerRoute(deps);
  registerGetProposalsByCategoryRoute(deps);
  registerGetClosedProposalsRoute(deps);
  registerListActionsRoute(deps);
  registerGetInvestigationsCountRoute(deps);
  registerGetScanFailuresRoute(deps);
  registerHuntRoutes(deps);
};
