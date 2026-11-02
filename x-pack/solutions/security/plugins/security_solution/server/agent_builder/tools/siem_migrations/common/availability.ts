/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolAvailabilityConfig } from '@kbn/agent-builder-server';
import type { ToolAvailabilityContext } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { getAgentBuilderResourceAvailability } from '../../../utils/get_agent_builder_resource_availability';

/**
 * Shared availability handler for SIEM migration tools. Environment/space-level gates only
 * (PLI + license + space solution), so the result is cacheable per space (`cacheMode: 'space'`).
 *
 * The `siemMigrations` Product Feature (PLI) gate hides the tools when the Automatic Migration
 * product line item is off — on serverless this prevents an "advertised then 404" UX, since the
 * post-auth API access control would otherwise 404 the underlying routes. Per-user privilege
 * checks for mutations happen in the tool handler — see start_rule_migration_tool.
 */
export const createSiemMigrationAvailability = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  productFeaturesService: ProductFeaturesService,
  logger: Logger
): ToolAvailabilityConfig => ({
  cacheMode: 'space' as const,
  handler: async ({ request }: ToolAvailabilityContext) => {
    const spaceAvailability = await getAgentBuilderResourceAvailability({ core, request, logger });
    if (spaceAvailability.status === 'unavailable') {
      return spaceAvailability;
    }

    try {
      if (!productFeaturesService.isEnabled(ProductFeatureKey.siemMigrations)) {
        return {
          status: 'unavailable' as const,
          reason: 'Automatic Migration is not enabled for this deployment.',
        };
      }
    } catch (error) {
      logger.error(
        `[SIEM migrations availability] Failed to check product feature: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
