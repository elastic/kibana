/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ReadOnlyConversationClient } from '@kbn/agent-builder-server';
import type { PndConfig } from '../config';
import type { PndSpaceIdResolver } from '../types';
import type { WatchWorkflowProjectionService } from '../services/watches/watch_workflow_projection_service';
import type { PndStore } from '../services/investigations/pnd_store';
import { registerListWatchesRoute } from './watches/list_watches';
import { registerGetWatchRoute } from './watches/get_watch';
import { registerListInvestigationsRoute } from './investigations/list_investigations';
import { registerGetInvestigationRoute } from './investigations/get_investigation';
import { registerListInvestigationProposalsRoute } from './investigations/list_proposals';
import { registerListAllProposalsRoute } from './investigations/list_all_proposals';
import { registerListApprovedProposalsRoute } from './investigations/list_approved_proposals';
import { registerAcceptProposalRoute } from './investigations/accept_proposal';
import { registerRejectProposalRoute } from './investigations/reject_proposal';
import { registerEscalateProposalRoute } from './investigations/escalate_proposal';
import { registerDeferProposalRoute } from './investigations/defer_proposal';
import { registerAssignProposalRoute } from './investigations/assign_proposal';
import { registerEndpointEventsRoute } from './investigations/endpoint_events';
import { registerModifyProposalRoute } from './investigations/modify_proposal';
import { registerGenerateProposalRoute } from './investigations/generate_proposal';
import { registerEmitProposalRoute } from './investigations/emit_proposal';
import { registerGetConversationRoute } from './investigations/get_conversation';
import { registerEnrichAlertRoute } from './investigations/enrich_alert';
import { registerPromoteToIncidentRoute } from './investigations/promote_to_incident';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  config: PndConfig;
  getSpaceId: PndSpaceIdResolver;
  getWatchProjection: () => WatchWorkflowProjectionService | undefined;
  getWorkflowsManagement: () => WorkflowsServerPluginSetup['management'] | undefined;
  getInvestigationStore: () => PndStore | undefined;
  /**
   * Resolver for a read-only platform Conversation client, scoped to the
   * given request. Undefined when the `agentBuilder` plugin is unavailable
   * (optional plugin not enabled) — callers should treat that the same as
   * "conversation integration not enabled".
   *
   * Deferred like {@link getInvestigationStore}: `agentBuilder`'s
   * `conversations` service is only populated on the plugin's `start()`
   * (see plugin.ts), while routes are registered during `setup()`.
   */
  getConversationClient?: (
    request: KibanaRequest
  ) => Promise<ReadOnlyConversationClient> | undefined;
}

export const registerRoutes = (deps: RouteDependencies): void => {
  registerListWatchesRoute(deps);
  registerGetWatchRoute(deps);
  registerListInvestigationsRoute(deps);
  registerGetInvestigationRoute(deps);
  registerListInvestigationProposalsRoute(deps);
  registerListAllProposalsRoute(deps);
  registerListApprovedProposalsRoute(deps);
  registerAcceptProposalRoute(deps);
  registerRejectProposalRoute(deps);
  registerEscalateProposalRoute(deps);
  registerDeferProposalRoute(deps);
  registerAssignProposalRoute(deps);
  registerEndpointEventsRoute(deps);
  registerModifyProposalRoute(deps);
  registerGenerateProposalRoute(deps);
  registerEmitProposalRoute(deps);
  registerGetConversationRoute(deps);
  registerEnrichAlertRoute(deps);
  registerPromoteToIncidentRoute(deps);
};
