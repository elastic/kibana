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
import { analyseEnvironmentTool, extractIocsTool } from './threat_intelligence';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

/**
 * Registers all security agent builder tools with the agentBuilder plugin.
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
  agentBuilder.tools.register(entityRiskScoreTool(core, logger));
  agentBuilder.tools.register(attackDiscoverySearchTool(core, logger));
  agentBuilder.tools.register(securityLabsSearchTool(core));
  agentBuilder.tools.register(createDetectionRuleTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(alertsTool(core, logger));
  agentBuilder.tools.register(getEntityTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(searchEntitiesTool(core, logger, experimentalFeatures));

  if (experimentalFeatures.pciComplianceAgentBuilder) {
    agentBuilder.tools.register(pciScopeDiscoveryTool(core, logger));
    agentBuilder.tools.register(pciComplianceTool(core, logger));
    agentBuilder.tools.register(pciFieldMapperTool(core, logger));
  }

  // Threat-intelligence Agent Builder tools (folded in from the standalone
  // threat-intelligence plugin). Gated behind the
  // `threatIntelligenceSkillEnabled` experimental flag.
  //
  // Only the two `BuiltinToolDefinition` tools are globally registered here:
  //   - `extractIocsTool`         — invoked by Workflow 2 as a builtin step
  //   - `analyseEnvironmentTool`  — used by the orchestrating agent through
  //     the registry to tailor feed recommendations without consuming one of
  //     the skill's seven inline-tool slots.
  // The remaining seven tools are `BuiltinSkillBoundedTool` and are
  // surfaced inline on the threat-intelligence skill (see
  // `agent_builder/skills/threat_intelligence/threat_intelligence_skill.ts`);
  // they are not registered in the global tool registry by design.
  if (experimentalFeatures.threatIntelligenceSkillEnabled) {
    agentBuilder.tools.register(extractIocsTool);
    agentBuilder.tools.register(analyseEnvironmentTool);
  }
};
