/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ToolAvailabilityContext } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import type { ProductFeaturesService } from '../../../lib/product_features_service/product_features_service';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getRuleMigrationTool } from './get_rule_migration_tool';
import { startRuleMigrationTool } from './start_rule_migration_tool';
import { getAllRuleMigrationStatsTool } from './get_all_rule_migration_stats_tool';
import { getMigrationRulesTool } from './get_migration_rules_tool';
import { getRuleMigrationStatsTool } from './get_rule_migration_stats_tool';
import { getRuleMigrationTranslationStatsTool } from './get_rule_migration_translation_stats_tool';

/**
 * Shared availability handler for SIEM migration tools. Environment/space-level gates only
 * (PLI + license + space solution), so the result is cacheable per space (`cacheMode: 'space'`).
 *
 * The `siemMigrations` Product Feature (PLI) gate hides the tools when the Automatic Migration
 * product line item is off — on serverless this prevents an "advertised then 404" UX, since the
 * post-auth API access control would otherwise 404 the underlying routes. Per-user privilege
 * checks for mutations happen in the tool handler — see start_rule_migration_tool.
 */
const createSiemMigrationAvailability = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  productFeaturesService: ProductFeaturesService,
  logger: Logger
) => ({
  cacheMode: 'space' as const,
  handler: async ({ request }: ToolAvailabilityContext) => {
    const spaceAvailability = await getAgentBuilderResourceAvailability({ core, request, logger });
    if (spaceAvailability.status === 'unavailable') {
      return spaceAvailability;
    }

    // PLI gate: hide tools when the Automatic Migration product feature is off. `isEnabled` throws
    // if the service has not been configured yet — treat that as unavailable (fail closed) rather
    // than surfacing tools that would 404 on use.
    try {
      if (!productFeaturesService.isEnabled(ProductFeatureKey.siemMigrations)) {
        return {
          status: 'unavailable' as const,
          reason: 'Automatic Migration is not enabled for this deployment.',
        };
      }
    } catch {
      return {
        status: 'unavailable' as const,
        reason: 'Automatic Migration availability could not be determined.',
      };
    }

    const [, pluginsStart] = await core.getStartServices();
    const license = await pluginsStart.licensing.getLicense();
    if (!license.hasAtLeast('enterprise')) {
      return {
        status: 'unavailable' as const,
        reason: 'Automatic Migration requires an Enterprise license.',
      };
    }

    return { status: 'available' as const };
  },
});

export const registerSiemMigrationTools = (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  productFeaturesService: ProductFeaturesService,
  logger: Logger
) => {
  const availability = createSiemMigrationAvailability(core, productFeaturesService, logger);

  const getRuleMigration = getRuleMigrationTool(core, logger);
  agentBuilder.tools.register({ ...getRuleMigration, availability });

  const startRuleMigration = startRuleMigrationTool(core, logger);
  agentBuilder.tools.register({ ...startRuleMigration, availability });

  const getAllRuleMigrationStats = getAllRuleMigrationStatsTool(core, logger);
  agentBuilder.tools.register({ ...getAllRuleMigrationStats, availability });

  const getMigrationRules = getMigrationRulesTool(core, logger);
  agentBuilder.tools.register({ ...getMigrationRules, availability });

  const getRuleMigrationStats = getRuleMigrationStatsTool(core, logger);
  agentBuilder.tools.register({ ...getRuleMigrationStats, availability });

  const getRuleMigrationTranslationStats = getRuleMigrationTranslationStatsTool(core, logger);
  agentBuilder.tools.register({ ...getRuleMigrationTranslationStats, availability });
};
