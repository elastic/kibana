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
  pciAutonomousScopeDiscoveryTool,
  pciAutonomousComplianceCheckTool,
  pciAutonomousScorecardReportTool,
  pciAutonomousFieldMapperTool,
} from './pci_autonomous_tools';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

/**
 * Registers all security agent builder tools with the agentBuilder plugin.
 *
 * PCI compliance tools are gated by two separate experimental flags, each registering a
 * distinct, *non-overlapping* tool bundle:
 *
 *  - `pciComplianceAgentBuilder` → hand-written variant: `pci_scope_discovery`,
 *    `pci_compliance` (consolidated check+report tool with a `mode` parameter),
 *    `pci_field_mapper`.
 *  - `pciComplianceAutonomousAgentBuilder` → autonomous variant: `pci_autonomous_scope_discovery`,
 *    `pci_autonomous_compliance_check`, `pci_autonomous_scorecard_report`,
 *    `pci_autonomous_field_mapper` (per the autonomous architect's blueprint that splits
 *    check and report into two specialised tools).
 *
 * The two bundles are fully independent at every layer (v6 deep autonomy): tool IDs,
 * schemas, descriptions, decomposition, the PCI DSS requirement catalog, the ES|QL
 * evaluator pipeline, and the ECS field-mapping heuristics are each authored separately
 * in `pci_autonomous_tools/` rather than imported from the hand-written sibling. The
 * CI test `pci_autonomous_modules_no_handwritten_imports.test.ts` enforces zero
 * `pci_compliance_*` imports from the autonomous bundle.
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

  if (experimentalFeatures.pciComplianceAutonomousAgentBuilder) {
    agentBuilder.tools.register(pciAutonomousScopeDiscoveryTool(core, logger));
    agentBuilder.tools.register(pciAutonomousComplianceCheckTool(core, logger));
    agentBuilder.tools.register(pciAutonomousScorecardReportTool(core, logger));
    agentBuilder.tools.register(pciAutonomousFieldMapperTool(core, logger));
  }
};
