/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { WatchlistConfigClient } from '../../../../lib/entity_analytics/watchlists/management/watchlist_config';
import { securityTool } from '../../constants';
import { checkWatchlistAccess } from './check_watchlist_access';
import { getWatchlistToolAvailability } from './watchlist_availability';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';

const schema = z.object({
  identifier: z
    .string()
    .min(1)
    .describe(
      'A watchlist reference — its id OR its name. Pass whatever the user gave you (usually the name); the tool figures out which it is.'
    ),
});

export const SECURITY_GET_WATCHLIST_ID_TOOL_ID = securityTool('get_watchlist_id');

export const getWatchlistIdTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_GET_WATCHLIST_ID_TOOL_ID,
    type: ToolType.builtin,
    description: `Resolve a watchlist reference (its id OR its name) to the canonical watchlist \`id\`.

Use this whenever you hold a watchlist reference and need its id but are not certain the reference already IS the id — for example before \`security.search_entities\` with \`watchlists: [<id>]\`, or before a watchlist mutation. Pass the reference exactly as the user gave it (usually the name).

- If the reference is already a valid id, it is returned unchanged.
- Otherwise it is matched **exactly** against watchlist names (case-sensitive). Pass the name as the user wrote it.
- On success returns \`watchlistId\` and \`name\`. If no watchlist has that exact name (or several do), returns an error — relay it and offer \`security.list_watchlists\` so the user can see the exact names / pick.

This is a read-only lookup; it does not require confirmation. To *enumerate* watchlists ("what watchlists do we have"), use \`security.list_watchlists\` instead.`,
    schema,
    tags: ['security', 'entity-analytics', 'watchlists'],
    annotations: {
      title: 'Get Watchlist ID',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: {
      cacheMode: 'space',
      handler: ({ request }) =>
        getWatchlistToolAvailability({ core, request, logger, experimentalFeatures }),
    },
    handler: async ({ identifier }, { spaceId, esClient, savedObjectsClient, request }) => {
      logger.debug(
        `${SECURITY_GET_WATCHLIST_ID_TOOL_ID} tool called for identifier "${identifier}"`
      );

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_GET_WATCHLIST_ID_TOOL_ID,
        spaceId,
        actionType: 'read',
      });

      try {
        const [, startPlugins] = await core.getStartServices();
        const { security } = startPlugins;

        const accessResult = await checkWatchlistAccess({
          request,
          security,
          spaceId,
          type: 'read',
          action: 'read watchlists',
        });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const client = new WatchlistConfigClient({
          soClient: savedObjectsClient,
          esClient: esClient.asCurrentUser,
          namespace: spaceId,
          logger,
        });

        const resolved = await client.resolveIdentifier(identifier);
        if ('error' in resolved) {
          telemetryTracker.recordFailure(resolved.error);
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: resolved.error },
              },
            ],
          };
        }

        telemetryTracker.recordResultCount(1);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: { watchlistId: resolved.id, name: resolved.name },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        telemetryTracker.recordFailure(errorMessage);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error resolving watchlist "${identifier}": ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};
