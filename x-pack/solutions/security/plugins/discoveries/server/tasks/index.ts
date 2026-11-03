/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { ActionsTasksStart } from '@kbn/actions-plugin/server/tasks';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { EventLogTasksSetup } from '@kbn/event-log-plugin/server/tasks';
import type { InferenceTasksStart } from '@kbn/inference-plugin/server/tasks';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from '@kbn/search-inference-endpoints/server';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';
import type {
  WorkflowsExtensionsTasksSetup,
  WorkflowsExtensionsTasksStart,
} from '@kbn/workflows-extensions/server/tasks';
import {
  ATTACK_DISCOVERY_MISCONFIGURATION_EVENT,
  ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT,
  ATTACK_DISCOVERY_STEP_FAILURE_EVENT,
} from '@kbn/discoveries/impl/lib/telemetry/event_based_telemetry';
import { reportMisconfiguration } from '@kbn/discoveries/impl/lib/telemetry/report_misconfiguration';
import type { WorkflowsManagementTasksSetup } from '@kbn/workflows-management-plugin/server/tasks';
import { registerDiscoveriesAgentBuilderContributions } from '../agent_builder/register_agent_builder_contributions';
import { DEFAULT_CONNECTOR_TIMEOUT_MS } from '../config';
import { registerWorkflowSteps } from '../workflows/register_workflow_steps';
import { createPodAdhocAttackDiscoveryDataClient } from './adhoc_data_client';
import { discoveriesBridge } from './bridge';

export { config } from '../config';

interface TasksSetupDeps {
  agentBuilder?: AgentBuilderPluginSetup;
  /** The event log service; `getIndexPattern` is there at runtime but not in the tasks contract type. */
  eventLog: EventLogTasksSetup & { getIndexPattern: () => string };
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginSetup;
  workflowsExtensions: WorkflowsExtensionsTasksSetup;
  workflowsManagement?: WorkflowsManagementTasksSetup;
}

interface TasksStartDeps {
  actions: ActionsTasksStart;
  inference?: InferenceTasksStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  security: SecurityTasksStart;
  spaces?: SpacesTasksStart;
  workflowsExtensions: WorkflowsExtensionsTasksStart;
}

interface DiscoveriesTasksConfig {
  connectorTimeout?: number;
  langSmithApiKey?: string;
  langSmithProject?: string;
}

/**
 * The Attack Discovery workflow steps and the agent builder attachments and skills for a task pod:
 * the same definitions as Kibana's server entry (see `workflows/register_workflow_steps.ts` and
 * `agent_builder/register_agent_builder_contributions.ts`).
 *
 * The `run` step, the `run_attack_discovery` and `get_attack_discovery_status` tools and the
 * workflow troubleshooting skill use the workflows management API of its tasks entry, as in Kibana.
 * A pod has no rule registry,
 * so the persist step and the attachment use a data client over the same ad-hoc alerts index (see
 * `adhoc_data_client.ts`). Routes, the managed workflows and the scheduled workflow executor stay
 * in Kibana.
 */
class DiscoveriesTasksPlugin implements TasksPlugin<{}, {}, TasksSetupDeps, TasksStartDeps> {
  private readonly config: DiscoveriesTasksConfig;
  private coreStart?: CoreTasksStart;

  constructor(private readonly context: PluginInitializerContext<DiscoveriesTasksConfig>) {
    this.config = context.config.get();
  }

  setup(core: CoreTasksSetup<TasksStartDeps>, deps: TasksSetupDeps) {
    // In Kibana the server entry registered all of this already (and registering the event types
    // twice would throw).
    if (discoveriesBridge.getSetup()) return {};

    const logger = this.context.logger.get();
    const analytics = core.analytics as never as Parameters<
      typeof reportMisconfiguration
    >[0]['analytics'];

    core.analytics.registerEventType(ATTACK_DISCOVERY_MISCONFIGURATION_EVENT);
    core.analytics.registerEventType(ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT);
    core.analytics.registerEventType(ATTACK_DISCOVERY_STEP_FAILURE_EVENT);

    const adhocAttackDiscoveryDataClient = createPodAdhocAttackDiscoveryDataClient(() => {
      if (!this.coreStart) throw new Error('discoveries tasks entry has not started');
      return this.coreStart.elasticsearch.client.asInternalUser;
    });

    const eventLogIndex = deps.eventLog.getIndexPattern();
    const getEventLogIndex = async () => eventLogIndex;
    const getEventLogger = async () =>
      deps.eventLog.getLogger({ event: { provider: 'securitySolution.attackDiscovery' } });

    // The steps and tools read Core and the other plugins through here, as in Kibana.
    const getStartServices = (async () => {
      const [coreStart, pluginsStart] = await core.getStartServices();
      return { coreStart, pluginsStart };
    }) as never as Parameters<typeof registerWorkflowSteps>[1]['getStartServices'];

    const { failedSteps } = registerWorkflowSteps(deps.workflowsExtensions, {
      adhocAttackDiscoveryDataClient,
      analytics,
      connectorTimeout: this.config.connectorTimeout ?? DEFAULT_CONNECTOR_TIMEOUT_MS,
      getEventLogIndex,
      getEventLogger,
      getStartServices,
      langSmithApiKey: this.config.langSmithApiKey,
      langSmithProject: this.config.langSmithProject,
      logger,
      workflowsManagementApi: deps.workflowsManagement?.management,
    });

    if (failedSteps.length > 0) {
      reportMisconfiguration({
        analytics,
        logger,
        params: {
          detail: `Failed to register steps: ${failedSteps
            .map((s) => `${s.id} (${s.error})`)
            .join(', ')}`,
          misconfiguration_type: 'step_registration_failed',
        },
      });
    }

    if (deps.agentBuilder) {
      registerDiscoveriesAgentBuilderContributions({
        adhocAttackDiscoveryDataClient,
        agentBuilder: deps.agentBuilder,
        analytics,
        getEventLogIndex,
        getEventLogger,
        getStartServices,
        logger,
        workflowsManagementApi: deps.workflowsManagement?.management,
      });
    }

    return {};
  }

  start(core: CoreTasksStart) {
    this.coreStart = core;
    return {};
  }
}

export const plugin = async (context: PluginInitializerContext<DiscoveriesTasksConfig>) =>
  new DiscoveriesTasksPlugin(context);
