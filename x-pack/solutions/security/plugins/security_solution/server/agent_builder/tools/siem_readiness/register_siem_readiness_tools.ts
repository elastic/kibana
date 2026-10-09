/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getCoverageTool } from './get_coverage_tool';
import { getQualityTool } from './get_quality_tool';
import { getContinuityTool } from './get_continuity_tool';
import { getRetentionTool } from './get_retention_tool';

export const registerSiemReadinessTools = (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  isServerless: boolean
) => {
  agentBuilder.tools.register(getCoverageTool(core, logger));
  agentBuilder.tools.register(getQualityTool(core, logger));
  agentBuilder.tools.register(getContinuityTool(core, logger, isServerless));
  agentBuilder.tools.register(getRetentionTool(core, logger, isServerless));
};
