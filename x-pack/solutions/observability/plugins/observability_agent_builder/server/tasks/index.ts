/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ApmDataAccessTasksSetup } from '@kbn/apm-data-access-plugin/server/tasks';
import type { MetricsDataAccessTasksSetup } from '@kbn/metrics-data-access-plugin/server/tasks';
import type { LogsDataAccessTasksStart } from '@kbn/logs-data-access-plugin/server/tasks';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type { RuleRegistryTasksStart } from '@kbn/rule-registry-plugin/server/tasks';
import { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import { registerObservabilityAgentBuilder } from '../register_agent_builder';
import type {
  ObservabilityAgentBuilderPluginSetup,
  ObservabilityAgentBuilderStartServices,
} from '../types';
import { observabilityAgentBuilderBridge } from './bridge';

export type ObservabilityAgentBuilderTasksSetup = ObservabilityAgentBuilderPluginSetup;

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
  apmDataAccess: ApmDataAccessTasksSetup;
  metricsDataAccess: MetricsDataAccessTasksSetup;
}

/** The tasks contracts of what the tools read at start (the `getStartServices` of Core). */
interface TasksStartDeps {
  logsDataAccess: LogsDataAccessTasksStart;
  licensing: LicensingTasksStart;
  ruleRegistry: RuleRegistryTasksStart;
}

/**
 * The agent builder side of Observability Agent Builder for a task pod: the tools, the
 * investigation skill and the attachment types, registered by the same code as the plugin's `server`
 * entry, and the data registry that APM fills with its providers.
 *
 * What differs from Kibana, all because a pod has no such contract: the alerts client of the rule
 * registry is not available (the alerts tool and attachment fail with its message), neither is
 * Machine Learning (the anomaly detection tool fails as it does in Kibana without ML), and spaces
 * are not looked up, so tools are not hidden in spaces of another solution view.
 *
 * In Kibana the plugin registered all of it and this entry registers nothing (see `bridge.ts`).
 */
class ObservabilityAgentBuilderTasksPlugin
  implements TasksPlugin<ObservabilityAgentBuilderTasksSetup, {}, TasksSetupDeps, TasksStartDeps>
{
  private readonly dataRegistry: ObservabilityAgentBuilderDataRegistry;

  constructor(private readonly context: PluginInitializerContext) {
    this.dataRegistry = new ObservabilityAgentBuilderDataRegistry(context.logger.get());
  }

  setup(
    core: CoreTasksSetup<TasksStartDeps>,
    { agentBuilder, apmDataAccess, metricsDataAccess }: TasksSetupDeps
  ): ObservabilityAgentBuilderTasksSetup {
    // In Kibana the plugin's `server` entry registered the tools and owns the data registry.
    if (observabilityAgentBuilderBridge.getSetup()) {
      return { registerDataProvider: () => {} };
    }

    registerObservabilityAgentBuilder({
      core: core as unknown as ObservabilityAgentBuilderStartServices,
      plugins: { agentBuilder, apmDataAccess, metricsDataAccess },
      dataRegistry: this.dataRegistry,
      logger: this.context.logger.get(),
    });

    return {
      registerDataProvider: (id, provider) => this.dataRegistry.registerDataProvider(id, provider),
    };
  }

  start() {
    return {};
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new ObservabilityAgentBuilderTasksPlugin(context);
