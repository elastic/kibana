/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  IRouter,
  IScopedClusterClient,
  KibanaRequest,
  RequestHandlerContext,
  StartServicesAccessor,
} from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export type PndPluginSetup = Record<string, never>;
export type PndPluginStart = Record<string, never>;

export interface PndSetupDependencies {
  features: FeaturesPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

export interface PndStartDependencies {
  /**
   * Optional (it is in `kibana.jsonc`'s `optionalPlugins`), and the code must keep it that way:
   * `_derive` installs the three per-phase PND agents through it, and when it is absent the route
   * omits the agent ids so the orchestrators fall back to the default agent rather than failing.
   */
  agentBuilder?: AgentBuilderPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

export type PndRouter = IRouter;
export type PndSpaceIdResolver = (request: KibanaRequest) => string;

/**
 * Resolves the request's scoped Elasticsearch cluster client from the route handler context
 * (decision D3). See {@link import('./routes/register_routes').RouteDependencies.getEsClient} for
 * why PND has one at all, given README decision D7.
 */
export type PndEsClientAccessor = (context: RequestHandlerContext) => Promise<IScopedClusterClient>;

/** Accessor for core + plugin start contracts, used by routes that need CoreStart. */
export type PndStartServicesAccessor = StartServicesAccessor<PndStartDependencies, PndPluginStart>;

/**
 * Lazily resolves the workflows-management client the proposals routes drive
 * (`listWaitingForInputSteps`, `resumeWorkflowExecution`, `getWorkflowExecution`).
 * Returns `undefined` when Workflows is unavailable or mock data is in use — routes
 * respond with a 503 rather than assuming it is present.
 */
export type PndWorkflowsManagementClientAccessor = () =>
  | import('./services/watches/watch_workflows_management_client').WatchWorkflowsManagementClient
  | undefined;
