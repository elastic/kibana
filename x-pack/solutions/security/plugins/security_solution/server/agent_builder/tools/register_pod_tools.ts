/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { alertsTool } from './alerts_tool';
import { attackDiscoverySearchTool } from './attack_discovery_search_tool';
import { buildRedirectUrlTool } from './build_redirect_url_tool';
import { entityRiskScoreTool } from './entity_analytics/entity_risk_score_tool';
import { pciComplianceTool } from './pci_compliance_tool';
import { pciFieldMapperTool } from './pci_field_mapper_tool';
import { pciScopeDiscoveryTool } from './pci_scope_discovery_tool';

/**
 * The security tools that run wherever a task runtime provides Elasticsearch, saved objects and
 * UI settings: Kibana (`registerTools`) and task pods (`server/tasks`). They only read the core
 * start services through `core.getStartServices()`; the tools that need other plugins (entity
 * store, alerting, ML, ...) are registered by `registerTools` alone.
 */
export const registerPodTools = ({
  agentBuilder,
  core,
  logger,
  experimentalFeatures,
}: {
  agentBuilder: Pick<AgentBuilderPluginSetup, 'tools'>;
  core: SecuritySolutionPluginCoreSetupDependencies;
  logger: Logger;
  experimentalFeatures: ExperimentalFeatures;
}): void => {
  agentBuilder.tools.register(entityRiskScoreTool(core, logger));
  agentBuilder.tools.register(attackDiscoverySearchTool(core, logger));
  agentBuilder.tools.register(alertsTool(core, logger));
  agentBuilder.tools.register(buildRedirectUrlTool(core, experimentalFeatures));

  if (experimentalFeatures.pciComplianceAgentBuilder) {
    agentBuilder.tools.register(pciScopeDiscoveryTool(core, logger));
    agentBuilder.tools.register(pciComplianceTool(core, logger));
    agentBuilder.tools.register(pciFieldMapperTool(core, logger));
  }
};
