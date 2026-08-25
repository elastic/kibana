/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

/**
 * Availability handler for Security Agent Builder resources.
 * Gates availability to Security or Classic solution spaces.
 * If spaces are unavailable, returns available.
 */
export async function getAgentBuilderResourceAvailability({
  core,
  request,
  logger,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
}): Promise<ToolAvailabilityResult> {
  try {
    const [, pluginsStart] = await core.getStartServices();
    const activeSpace = await pluginsStart.spaces?.spacesService.getActiveSpace(request);
    const solution = activeSpace?.solution;
    const isAllowedSolution = !solution || solution === 'classic' || solution === 'security';

    if (!isAllowedSolution) {
      logger.debug(
        'Security agent builder resources are not available in this space, skipping registration.'
      );

      return {
        status: 'unavailable',
        reason: 'Security agent builder resources are not available in this space',
      };
    }
  } catch (error) {
    logger.debug(
      'Spaces are unavailable, returning available for Security agent builder resources.'
    );
    logger.debug(error);
  }

  return { status: 'available' };
}
