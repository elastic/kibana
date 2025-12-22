/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { platformCoreTools } from '@kbn/onechat-common';
import type { StaticToolRegistration } from '@kbn/onechat-server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import {
  OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
  createGetDataSourcesTool,
} from './get_data_sources/get_data_sources';
import {
  OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
  createRunLogRateAnalysisTool,
} from './run_log_rate_analysis/run_log_rate_analysis';
import {
  OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
  createGetAnomalyDetectionJobsTool,
} from './get_anomaly_detection_jobs/get_anomaly_detection_jobs';
import { OBSERVABILITY_GET_ALERTS_TOOL_ID, createGetAlertsTool } from './get_alerts/get_alerts';
import {
  OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID,
  createGetLogCategoriesTool,
} from './get_log_categories/get_log_categories';
import {
  OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
  createGetCorrelatedLogsTool,
} from './get_correlated_logs/get_correlated_logs';
import {
  createGetServicesTool,
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
} from './get_services/get_services';
import {
  createDownstreamDependenciesTool,
  OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
} from './get_downstream_dependencies/get_downstream_dependencies';

const PLATFORM_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.productDocumentation,
];

const OBSERVABILITY_TOOL_IDS = [
  OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
  OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
  OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
  OBSERVABILITY_GET_ALERTS_TOOL_ID,
  OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID,
  OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
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
    createGetDataSourcesTool({ core, plugins, logger }),
    createRunLogRateAnalysisTool({ core, logger }),
    createGetAnomalyDetectionJobsTool({ core, plugins, logger }),
    createGetAlertsTool({ core, logger }),
    createGetLogCategoriesTool({ core, logger }),
    createGetServicesTool({ core, dataRegistry, logger }),
    createDownstreamDependenciesTool({ core, dataRegistry, logger }),
    createGetCorrelatedLogsTool({ core, logger }),
  ];

  for (const tool of observabilityTools) {
    plugins.onechat.tools.register(tool);
  }
}
