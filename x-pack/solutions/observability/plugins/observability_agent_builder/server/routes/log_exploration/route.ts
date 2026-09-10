/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import type { ServerRouteRepository } from '@kbn/server-route-repository-utils';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import type { LogExplorationResult } from '../../../common/log_exploration';
import {
  LOG_PATTERNS_API_PATH,
  LOG_VOLUME_COMPARISON_API_PATH,
  logExplorationRequestSchema,
} from '../../../common/log_exploration';
import { getLogPatterns } from '../../tools/explore_log_patterns/handler';
import { getLogVolumeComparison } from '../../tools/explore_log_volume_comparison/handler';
import { createObservabilityAgentBuilderServerRoute } from '../create_observability_agent_builder_server_route';

/**
 * Lets the log exploration renderer re-run its own query when the user steers the view, without
 * spending an agent turn. Stateless on purpose: the renderer already holds every parameter and
 * writes the returned data back into the attachment itself, so these routes share the tools' query
 * handlers and know nothing about conversations.
 *
 * Both take the attachment state minus its `result` and return exactly that `result`, so a request
 * cannot describe a narrowing whose answer then ignores it.
 */
export function getObservabilityAgentBuilderLogExplorationRouteRepository(): ServerRouteRepository {
  const logPatternsRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: `POST ${LOG_PATTERNS_API_PATH}`,
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readAgentBuilder],
      },
    },
    params: z.object({
      body: logExplorationRequestSchema,
    }),
    handler: async ({ context, params }): Promise<LogExplorationResult> => {
      const { source, refinements } = params.body;
      const { elasticsearch } = await context.core;

      const patterns = await getLogPatterns({
        esClient: elasticsearch.client,
        start: source.timeRange.start,
        end: source.timeRange.end,
        index: source.index,
        messageField: source.messageField,
        refinements,
      });

      return { type: 'pattern-table', patterns, generatedAt: new Date().toISOString() };
    },
  });

  const logVolumeComparisonRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: `POST ${LOG_VOLUME_COMPARISON_API_PATH}`,
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readAgentBuilder],
      },
    },
    params: z.object({
      body: logExplorationRequestSchema,
    }),
    handler: async ({ context, params }): Promise<LogExplorationResult> => {
      const { source, refinements, view } = params.body;
      const { elasticsearch } = await context.core;

      // The baseline epoch is a parameter of this lens, so no other lens can ask for this result.
      if (view.type !== 'volume-comparison') {
        throw badRequest(`Expected a volume-comparison view, received "${view.type}"`);
      }

      const histogram = await getLogVolumeComparison({
        esClient: elasticsearch.client,
        index: source.index,
        messageField: source.messageField,
        refinements,
        start: source.timeRange.start,
        end: source.timeRange.end,
        baselineStart: view.baselineEpoch.start,
        baselineEnd: view.baselineEpoch.end,
      });

      return { type: 'volume-comparison', histogram, generatedAt: new Date().toISOString() };
    },
  });

  return {
    ...logPatternsRoute,
    ...logVolumeComparisonRoute,
  };
}
