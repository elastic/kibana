/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import { AI_AGENTS_FEATURE_FLAG, AI_AGENTS_FEATURE_FLAG_DEFAULT } from '@kbn/ai-assistant-common';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../types';

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
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  request: KibanaRequest;
  logger: Logger;
}): Promise<ToolAvailabilityResult> {
  const [coreStart, pluginsStart] = await core.getStartServices();

  const isAiAgentsEnabled = await coreStart.featureFlags.getBooleanValue(
    AI_AGENTS_FEATURE_FLAG,
    AI_AGENTS_FEATURE_FLAG_DEFAULT
  );

  if (!isAiAgentsEnabled) {
    logger.debug(`AI agents are disabled (${AI_AGENTS_FEATURE_FLAG}), skipping registration.`);
    return {
      status: 'unavailable',
      reason: `AI agents are disabled (${AI_AGENTS_FEATURE_FLAG})`,
    };
  }

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
