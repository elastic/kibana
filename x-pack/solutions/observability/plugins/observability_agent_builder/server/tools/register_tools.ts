/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import {
  OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
  createRunLogRateAnalysisTool,
} from './run_log_rate_analysis/tool';
import {
  OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
  createGetAnomalyDetectionJobsTool,
} from './get_anomaly_detection_jobs/tool';
import { OBSERVABILITY_GET_ALERTS_TOOL_ID, createGetAlertsTool } from './get_alerts/tool';
import {
  OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID,
  createGetLogCategoriesTool,
} from './get_log_categories/tool';
import {
  OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
  createGetCorrelatedLogsTool,
} from './get_correlated_logs/tool';
import { OBSERVABILITY_GET_HOSTS_TOOL_ID, createGetHostsTool } from './get_hosts/tool';
import { createGetServicesTool, OBSERVABILITY_GET_SERVICES_TOOL_ID } from './get_services/tool';
import {
  createDownstreamDependenciesTool,
  OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
} from './get_downstream_dependencies/tool';
import {
  createGetTraceMetricsTool,
  OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
} from './get_trace_metrics/tool';
import {
  OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
  createGetLogChangePointsTool,
} from './get_log_change_points/tool';
import {
  OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
  createGetMetricChangePointsTool,
} from './get_metric_change_points/tool';
import {
  OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID,
  createGetTraceChangePointsTool,
} from './get_trace_change_points/tool';
import { OBSERVABILITY_GET_INDEX_INFO_TOOL_ID, createGetIndexInfoTool } from './get_index_info';

const PLATFORM_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.productDocumentation,
];

const OBSERVABILITY_TOOL_IDS = [
  OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
  OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
  OBSERVABILITY_GET_ALERTS_TOOL_ID,
  OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID,
  OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
  OBSERVABILITY_GET_HOSTS_TOOL_ID,
  OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
  OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
];

export const OBSERVABILITY_AGENT_TOOL_IDS = [...PLATFORM_TOOL_IDS, ...OBSERVABILITY_TOOL_IDS];

export async function registerTools({
  core,
  plugins,
  dataRegistry,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
}) {
  const observabilityTools: StaticToolRegistration<any>[] = [
    createRunLogRateAnalysisTool({ core, logger }),
    createGetAnomalyDetectionJobsTool({ core, plugins, logger }),
    createGetAlertsTool({ core, logger }),
    createGetLogCategoriesTool({ core, logger }),
    createGetServicesTool({ core, plugins, dataRegistry, logger }),
    createDownstreamDependenciesTool({ core, dataRegistry, logger }),
    createGetCorrelatedLogsTool({ core, logger }),
    createGetHostsTool({ core, logger, dataRegistry }),
    createGetTraceMetricsTool({ core, plugins, logger }),
    createGetLogChangePointsTool({ core, plugins, logger }),
    createGetMetricChangePointsTool({ core, plugins, logger }),
    createGetTraceChangePointsTool({ core, plugins, logger }),
    createGetIndexInfoTool({ core, plugins, logger }),
  ];

  for (const tool of observabilityTools) {
    plugins.agentBuilder.tools.register(tool);
  }
}
