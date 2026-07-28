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
import {
  addEntitiesToWatchlistTool,
  createWatchlistTool,
  deleteWatchlistTool,
  entityRiskScoreTool,
  getEntityTool,
  listWatchlistsTool,
  removeEntitiesFromWatchlistTool,
  searchEntitiesTool,
  updateWatchlistTool,
  generateLeadsTool,
  listLeadsTool,
  dismissLeadTool,
  setAssetCriticalityTool,
} from './entity_analytics';
import { alertsTool } from './alerts_tool';
import { createDetectionRuleTool } from './create_detection_rule_tool';
import { pciComplianceTool } from './pci_compliance_tool';
import { pciScopeDiscoveryTool } from './pci_scope_discovery_tool';
import { pciFieldMapperTool } from './pci_field_mapper_tool';
import { registerSiemReadinessTools } from './siem_readiness';
import { runRulePreviewTool } from './run_rule_preview_tool';
import {
  analyseEnvironmentTool,
  extractIocsTool,
  huntBehaviorTool,
  synthesizeAdvisoryTool,
} from './threat_intelligence';
import type { RunRulePreviewDeps } from '../../lib/detection_engine/rule_preview/api/preview_rules/run_rule_preview';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SetupPlugins,
} from '../../plugin_contract';
import { SIEM_READINESS_AGENT_BUILDER_ENABLED } from '../siem_readiness_feature_flag';

/**
 * Registers all security agent builder tools with the agentBuilder plugin.
 *
 * PCI compliance tools are gated behind `experimentalFeatures.pciComplianceAgentBuilder` and the
 * `run_rule_preview` tool behind `experimentalFeatures.rulePreviewAttachmentEnabled` so the
 * features can ship dark and be enabled per environment.
 */
export const registerTools = (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  ml: SetupPlugins['ml'],
  rulePreviewDeps: RunRulePreviewDeps,
  isServerless: boolean = false,
  kibanaVersion: string,
  hasEncryptionKey: boolean = false
) => {
  agentBuilder.tools.register(entityRiskScoreTool(core, logger));
  agentBuilder.tools.register(attackDiscoverySearchTool(core, logger));
  agentBuilder.tools.register(securityLabsSearchTool(core));
  agentBuilder.tools.register(createDetectionRuleTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(alertsTool(core, logger));
  agentBuilder.tools.register(getEntityTool(core, logger, ml, experimentalFeatures));
  agentBuilder.tools.register(addEntitiesToWatchlistTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(createWatchlistTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(
    deleteWatchlistTool(core, logger, experimentalFeatures, hasEncryptionKey)
  );
  agentBuilder.tools.register(listWatchlistsTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(removeEntitiesFromWatchlistTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(searchEntitiesTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(
    setAssetCriticalityTool(core, logger, experimentalFeatures, kibanaVersion)
  );
  agentBuilder.tools.register(updateWatchlistTool(core, logger, experimentalFeatures));

  if (experimentalFeatures.rulePreviewAttachmentEnabled) {
    agentBuilder.tools.register(runRulePreviewTool(rulePreviewDeps));
  }

  if (experimentalFeatures.leadGenerationEnabled) {
    agentBuilder.tools.register(listLeadsTool(core, logger, experimentalFeatures));
    agentBuilder.tools.register(
      generateLeadsTool(core, logger, experimentalFeatures, rulePreviewDeps.getStartServices, ml)
    );
    agentBuilder.tools.register(dismissLeadTool(core, logger, experimentalFeatures));
  }

  if (experimentalFeatures.pciComplianceAgentBuilder) {
    agentBuilder.tools.register(pciScopeDiscoveryTool(core, logger));
    agentBuilder.tools.register(pciComplianceTool(core, logger));
    agentBuilder.tools.register(pciFieldMapperTool(core, logger));
  }

  // Threat-intelligence registry tools. Inline tools live on the skill;
  // extractIocs + analyseEnvironment + huntBehavior + synthesizeAdvisory
  // are globally registered (the skill is at its 7-inline-tool cap, so these
  // tools live on the registry instead — huntOrchestrator moved inline in
  // its place so the model sees the one-call Tier1+Tier2 default without a
  // registry lookup; description wording alone did not change routing).
  // huntOrchestratorTool is intentionally NOT registered here — it's
  // inline-only (BuiltinSkillBoundedTool) and loaded directly via the
  // skill's getInlineTools(), same as the other inline tools.
  if (experimentalFeatures.threatIntelligenceSkillEnabled) {
    agentBuilder.tools.register(extractIocsTool);
    agentBuilder.tools.register(analyseEnvironmentTool);
    agentBuilder.tools.register(huntBehaviorTool);
    agentBuilder.tools.register(synthesizeAdvisoryTool);
  }

  if (SIEM_READINESS_AGENT_BUILDER_ENABLED) {
    registerSiemReadinessTools(agentBuilder, core, logger, isServerless);
  }
};
