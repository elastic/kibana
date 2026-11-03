/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, CoreTasksStart, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { registerDiscoveryAgentType } from './agent_builder/agents/discovery/discovery';
import { registerFeatureIdentificationAgentType } from './agent_builder/agents/feature_identification/feature_identification_agent';
import { registerKIQueryGenerationAgentType } from './agent_builder/agents/ki_query_generation/ki_query_generation_agent';
import { registerAgentBuilderAttachments } from './agent_builder/attachments/register_attachments';
import { createSignificantEventsAvailability } from './agent_builder/tools/significant_events_availability';
import { registerAgentBuilderTools } from './agent_builder/tools/register_tools';
import { createSignificantEventsCoreSkills } from './agent_builder/skills/register_skills';
import { detectionsDataStream } from './lib/significant_events/detections';
import {
  knowledgeIndicatorsDataStream,
  KnowledgeIndicatorService,
} from './lib/knowledge_indicators';
import { sourceKnowledgeStateSavedObjectType } from './lib/knowledge_indicators/source_knowledge_state';
import { getSignificantEventsMaintenanceStateSavedObjectType } from './lib/maintenance/saved_object';
import { createMaintenanceStateStore, normalizeState } from './lib/maintenance/state_store';
import { isSignificantEventsSemanticCodeSearchGroundingEnabled } from './lib/semantic_code_search_grounding/is_significant_events_semantic_code_search_grounding_enabled';
import { EbtTelemetryService } from './lib/telemetry/ebt';
import { createSignificantEventsServices } from './lib/significant_events/significant_events_clients';
import {
  createAgentBuilderScopedClients,
  type AgentBuilderScopedClientsPluginsStart,
  type GetAgentBuilderScopedClients,
} from './scoped_clients';
import type { SignificantEventsServer } from './types';

/** What a pod's `start` hands to the tools registered at setup. */
export interface SignificantEventsPodStartDeps {
  security: SignificantEventsServer['security'];
  licensing: SignificantEventsServer['licensing'];
  inference: AgentBuilderScopedClientsPluginsStart['inference'];
  nightshiftSources: AgentBuilderScopedClientsPluginsStart['nightshiftSources'];
  alertingVTwo: AgentBuilderScopedClientsPluginsStart['alertingVTwo'];
  workflowsExtensions: AgentBuilderScopedClientsPluginsStart['workflowsExtensions'];
}

/**
 * What significant events contributes to Agent Builder in a task pod: the tools, attachment types,
 * skills and agent types Kibana registers (same factories), over the request clients built by
 * `createAgentBuilderScopedClients`.
 *
 * A pod differs from Kibana in these ways:
 * - Pricing tiers are not known to a pod, so a tool's availability assumes the tier (Kibana
 *   already gated the agent run that reached the pod); the feature flag, the license, the required
 *   plugins and the Nightshift privileges are checked as in Kibana.
 * - CPS is not available, so source data is read without project routing.
 * - The KI identification skill (it starts workflows through the workflows management API) and the
 *   Agent Builder SML types are not registered.
 * - The saved objects and data streams the tools read are registered, never created: Kibana
 *   installs them.
 */
export const registerSignificantEventsPodAgentBuilder = ({
  core,
  agentBuilder,
  workflowsManagement,
  logger,
  kibanaVersion,
  isServerless,
}: {
  core: CoreTasksSetup<SignificantEventsPodStartDeps>;
  agentBuilder: AgentBuilderPluginSetup;
  workflowsManagement: unknown;
  logger: Logger;
  kibanaVersion: string;
  isServerless: boolean;
}): { start: (coreStart: CoreTasksStart, deps: SignificantEventsPodStartDeps) => void } => {
  core.savedObjects.registerType(getSignificantEventsMaintenanceStateSavedObjectType());
  core.savedObjects.registerType(sourceKnowledgeStateSavedObjectType);
  core.dataStreams.registerDataStream(detectionsDataStream);
  core.dataStreams.registerDataStream(knowledgeIndicatorsDataStream);

  const ebtTelemetryService = new EbtTelemetryService();
  ebtTelemetryService.setup(core.analytics as never);
  const telemetry = ebtTelemetryService.getClient();

  // Filled at start, like the plugin's `server` object in Kibana.
  const server = {
    logger,
    kibanaVersion,
    isServerless,
    workflowsManagement,
    // Only its presence is checked (it is a required plugin of significant events).
    agentBuilder,
  } as unknown as SignificantEventsServer;

  const significantEventsServices = createSignificantEventsServices();
  const knowledgeIndicatorService = new KnowledgeIndicatorService(core, logger);

  const getScopedClients: GetAgentBuilderScopedClients = async ({ request }) => {
    const [coreStart, pluginsStart] = await core.getStartServices();
    return createAgentBuilderScopedClients({
      request,
      coreStart,
      pluginsStart,
      cpsEnabled: false,
      significantEventsServices,
      knowledgeIndicatorService,
      logger,
    });
  };

  const maintenanceStateStore = createMaintenanceStateStore(server);
  const maintenanceService = {
    getState: async ({ request }: { request: { spaceId: string } }) =>
      normalizeState((await maintenanceStateStore.readState(request.spaceId as never))?.state),
  };

  registerAgentBuilderAttachments({ agentBuilder, getScopedClients, server, logger });
  registerAgentBuilderTools({
    agentBuilder,
    getScopedClients,
    server,
    logger,
    telemetry,
    maintenanceService: maintenanceService as never,
  });

  registerDiscoveryAgentType(agentBuilder);
  registerFeatureIdentificationAgentType(agentBuilder);
  registerKIQueryGenerationAgentType(agentBuilder, async () =>
    server.core
      ? isSignificantEventsSemanticCodeSearchGroundingEnabled(server.core.featureFlags)
      : false
  );

  // Skills are gated per request by the same availability the tools use.
  const availability = createSignificantEventsAvailability({ server, logger });
  for (const skill of createSignificantEventsCoreSkills({
    telemetry,
    maintenanceService: undefined,
    getScopedClients,
    server,
    logger,
  })) {
    void agentBuilder.skills.register({ ...skill, availability } as never);
  }

  return {
    start: (coreStart, deps) => {
      server.core = {
        ...coreStart,
        // See the note above: the pricing tier is assumed.
        pricing: { isFeatureAvailable: () => true },
      } as never;
      server.security = deps.security as never;
      server.licensing = deps.licensing as never;
      server.workflowsExtensions = deps.workflowsExtensions as never;
    },
  };
};
