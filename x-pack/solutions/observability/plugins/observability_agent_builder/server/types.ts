/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
} from '@kbn/agent-builder-plugin/server/types';
import type {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
} from '@kbn/apm-data-access-plugin/server';
import type {
  LogsDataAccessPluginSetup,
  LogsDataAccessPluginStart,
} from '@kbn/logs-data-access-plugin/server';
import type {
  MetricsDataPluginSetup,
  MetricsDataPluginStart,
} from '@kbn/metrics-data-access-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ObservabilityAgentBuilderDataRegistry } from './data_registry/data_registry';

export interface ObservabilityAgentBuilderPluginSetup {
  registerDataProvider: ObservabilityAgentBuilderDataRegistry['registerDataProvider'];
}

export type ObservabilityAgentBuilderPluginStart = Record<string, never>;

export interface ObservabilityAgentBuilderPluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  apmDataAccess: ApmDataAccessPluginSetup;
  logsDataAccess: LogsDataAccessPluginSetup;
  metricsDataAccess: MetricsDataPluginSetup;
  security: SecurityPluginSetup;
  ml?: MlPluginSetup;
  inference: InferenceServerSetup;
}

export interface ObservabilityAgentBuilderPluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  apmDataAccess: ApmDataAccessPluginStart;
  logsDataAccess: LogsDataAccessPluginStart;
  metricsDataAccess: MetricsDataPluginStart;
  security: SecurityPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
  dataViews: DataViewsServerPluginStart;
  inference: InferenceServerStart;
  ml?: MlPluginStart;
  spaces?: SpacesPluginStart;
}

export type ObservabilityAgentBuilderCoreSetup = CoreSetup<
  ObservabilityAgentBuilderPluginStartDependencies,
  ObservabilityAgentBuilderPluginStart
>;
