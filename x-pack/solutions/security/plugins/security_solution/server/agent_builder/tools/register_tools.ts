/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../common';
import { securityLabsSearchTool } from './security_labs_search_tool';
import { attackDiscoverySearchTool } from './attack_discovery_search_tool';
import { entityRiskScoreTool, getEntityTool, searchEntitiesTool } from './entity_analytics';
import { alertsTool } from './alerts_tool';
import { createDetectionRuleTool } from './create_detection_rule_tool';
import { pciComplianceTool } from './pci_compliance_tool';
import { pciScopeDiscoveryTool } from './pci_scope_discovery_tool';
import { pciFieldMapperTool } from './pci_field_mapper_tool';
import {
  analyseEnvironmentTool,
  extractIocsTool,
  correlateThreatTool,
  correlateStartTool,
  correlatePollTool,
  searchByAnchorsTool,
  searchByDiamondTool,
  extractDiamondTool,
  getReportTool,
  correlateSynthesisPackTool,
} from './threat_intelligence';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const tryRegister = (
  agentBuilder: AgentBuilderPluginSetup,
  logger: Logger,
  tool: Parameters<AgentBuilderPluginSetup['tools']['register']>[0]
) => {
  try {
    agentBuilder.tools.register(tool);
  } catch (err) {
    logger.error(`Failed to register tool "${(tool as { id?: string }).id}": ${err}`);
  }
};

/**
 * Registers all security agent builder tools with the agentBuilder plugin.
 *
 * Each tool is wrapped in its own try/catch so a single registration failure
 * cannot silently prevent the remaining tools from registering.
 *
 * PCI compliance tools are gated behind `experimentalFeatures.pciComplianceAgentBuilder` so
 * the feature can ship dark and be enabled per environment.
 */
export const registerTools = async (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
) => {
  tryRegister(agentBuilder, logger, entityRiskScoreTool(core, logger));
  tryRegister(agentBuilder, logger, attackDiscoverySearchTool(core, logger));
  tryRegister(agentBuilder, logger, securityLabsSearchTool(core));
  tryRegister(agentBuilder, logger, createDetectionRuleTool(core, logger, experimentalFeatures));
  tryRegister(agentBuilder, logger, alertsTool(core, logger));
  tryRegister(agentBuilder, logger, getEntityTool(core, logger, experimentalFeatures));
  tryRegister(agentBuilder, logger, searchEntitiesTool(core, logger, experimentalFeatures));

  if (experimentalFeatures.pciComplianceAgentBuilder) {
    tryRegister(agentBuilder, logger, pciScopeDiscoveryTool(core, logger));
    tryRegister(agentBuilder, logger, pciComplianceTool(core, logger));
    tryRegister(agentBuilder, logger, pciFieldMapperTool(core, logger));
  }

  // Threat-intelligence Agent Builder tools (folded in from the standalone
  // threat-intelligence plugin). Gated behind the
  // `threatIntelligenceSkillEnabled` experimental flag.
  if (experimentalFeatures.threatIntelligenceSkillEnabled) {
    tryRegister(agentBuilder, logger, extractIocsTool);
    tryRegister(agentBuilder, logger, analyseEnvironmentTool);
    tryRegister(agentBuilder, logger, correlateThreatTool(core, logger));
    tryRegister(agentBuilder, logger, correlateStartTool(core, logger));
    tryRegister(agentBuilder, logger, correlatePollTool(logger));
    tryRegister(agentBuilder, logger, searchByAnchorsTool);
    tryRegister(agentBuilder, logger, searchByDiamondTool);
    tryRegister(agentBuilder, logger, extractDiamondTool(core, logger));
    tryRegister(agentBuilder, logger, getReportTool);
    tryRegister(agentBuilder, logger, correlateSynthesisPackTool(core, logger));
  }
};
