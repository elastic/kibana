/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';

/**
 * Availability handler for Observability Agent Builder resources.
 * Gates availability to Observability or Classic solution spaces.
 * If spaces are unavailable, returns available.
 */
export async function getAgentBuilderResourceAvailability({
  core,
  request,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  request: KibanaRequest;
  logger: Logger;
}): Promise<ToolAvailabilityResult> {
  const [, pluginsStart] = await core.getStartServices();

  try {
    const activeSpace = await pluginsStart.spaces?.spacesService.getActiveSpace(request);
    const solution = activeSpace?.solution;
    const isAllowedSolution = !solution || solution === 'classic' || solution === 'oblt';

    if (!isAllowedSolution) {
      logger.debug(
        'Observability agent builder resources are not available in this space, skipping registration.'
      );

      return {
        status: 'unavailable',
        reason: 'Observability agent builder resources are not available in this space',
      };
    }
  } catch (error) {
    logger.debug(
      'Spaces are unavailable, returning available for Observability agent builder resources.'
    );
    logger.debug(error);
  }

  return { status: 'available' };
}
