/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { ExperimentalFeatures } from '../../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../../../utils/get_agent_builder_resource_availability';

/**
 * Shared availability check for all watchlist tools.
 * Gates on: security/classic space, entityAnalyticsWatchlistEnabled FF, and Platinum license
 * (matching the minimum license required by the watchlist API routes).
 */
export const getWatchlistToolAvailability = async ({
  core,
  request,
  logger,
  experimentalFeatures,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  experimentalFeatures: ExperimentalFeatures;
}): Promise<ToolAvailabilityResult> => {
  const spaceAvailability = await getAgentBuilderResourceAvailability({ core, request, logger });
  if (spaceAvailability.status !== 'available') {
    return spaceAvailability;
  }

  if (!experimentalFeatures.entityAnalyticsWatchlistEnabled) {
    return { status: 'unavailable', reason: 'Entity Analytics watchlists are not enabled.' };
  }

  const [, startPlugins] = await core.getStartServices();
  const license = await startPlugins.licensing.getLicense();
  if (!license.hasAtLeast('platinum')) {
    return {
      status: 'unavailable',
      reason: 'Entity Analytics watchlists require a Platinum license or above.',
    };
  }

  return { status: 'available' };
};
