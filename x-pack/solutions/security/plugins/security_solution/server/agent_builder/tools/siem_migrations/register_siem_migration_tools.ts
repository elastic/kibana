/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import type { ProductFeaturesService } from '../../../lib/product_features_service/product_features_service';
import { getRuleMigrationTool } from './rules/get_rule_migration_tool';
import { startRuleMigrationTool } from './rules/start_rule_migration_tool';
import { getAllRuleMigrationStatsTool } from './rules/get_all_rule_migration_stats_tool';
import { getMigrationRulesTool } from './rules/get_migration_rules_tool';
import { getRuleMigrationStatsTool } from './rules/get_rule_migration_stats_tool';
import { getRuleMigrationTranslationStatsTool } from './rules/get_rule_migration_translation_stats_tool';

export const registerSiemMigrationTools = (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  productFeaturesService: ProductFeaturesService,
  logger: Logger
) => {
  agentBuilder.tools.register(getRuleMigrationTool(core, logger, productFeaturesService));
  agentBuilder.tools.register(startRuleMigrationTool(core, logger, productFeaturesService));
  agentBuilder.tools.register(getAllRuleMigrationStatsTool(core, logger, productFeaturesService));
  agentBuilder.tools.register(getMigrationRulesTool(core, logger, productFeaturesService));
  agentBuilder.tools.register(getRuleMigrationStatsTool(core, logger, productFeaturesService));
  agentBuilder.tools.register(
    getRuleMigrationTranslationStatsTool(core, logger, productFeaturesService)
  );
};
