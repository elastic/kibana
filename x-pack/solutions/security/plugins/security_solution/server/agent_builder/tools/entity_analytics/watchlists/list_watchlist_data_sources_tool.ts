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
import {
  WatchlistEntitySourceClient,
  watchlistEntitySourceTypeName,
} from '../../../../lib/entity_analytics/watchlists/entity_sources/infra';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { securityTool } from '../../constants';
import { checkWatchlistAccess } from './check_watchlist_access';
import { getWatchlistToolAvailability } from './watchlist_availability';
import { toDataSourceSummary } from './data_source_utils';

const schema = z.object({
  watchlistId: z
    .string()
    .min(1)
    .describe(
      'The id of the watchlist to inspect. Use `security.get_watchlist_id` to resolve a watchlist name to its id first when the user named the watchlist.'
    ),
});

export const SECURITY_LIST_WATCHLIST_DATA_SOURCES_TOOL_ID = securityTool(
  'list_watchlist_data_sources'
);

export const listWatchlistDataSourcesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  hasEncryptionKey: boolean
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_LIST_WATCHLIST_DATA_SOURCES_TOOL_ID,
    type: ToolType.builtin,
    description: `Lists every entity source (rule-based and managed integration) linked to a watchlist. Read-only; does NOT require confirmation.

Use this:
- Before \`security.set_watchlist_rule_based_data_source\`, to check whether a \`store\`/\`index\` source already exists (create vs update) and to show the current → new diff.
- To answer "what's keeping this watchlist in sync" or "why is this entity on this watchlist" — this is the ONLY way to see rule-based and managed membership sources; \`security.remove_entities_from_watchlist\` only reports manual assignments. NOTE: this lists the watchlist's possible sources, not a per-entity lookup — it does not tell you which specific source (or manual assignment) actually added a given entity. If more than one source exists, present them as candidate reasons rather than asserting which one is responsible for a specific entity.
- To detect a broken source: an \`index\`-type source with \`hasApiKey: false\` has lost its scoped credentials and needs re-authorization (re-run \`security.set_watchlist_rule_based_data_source\` on it, or fix it in the UI).

Resolve the watchlist id via \`security.get_watchlist_id\` first when the user named the watchlist.`,
    schema,
    tags: ['security', 'entity-analytics', 'watchlists'],
    annotations: {
      title: 'List Watchlist Data Sources',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: {
      cacheMode: 'space',
      handler: ({ request }) =>
        getWatchlistToolAvailability({
          core,
          request,
          logger,
          experimentalFeatures,
          requireEntityStoreV2: true,
        }),
    },
    handler: async (params, { spaceId, esClient, request }) => {
      logger.debug(
        `${SECURITY_LIST_WATCHLIST_DATA_SOURCES_TOOL_ID} tool called with parameters ${JSON.stringify(
          params
        )}`
      );

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_LIST_WATCHLIST_DATA_SOURCES_TOOL_ID,
        spaceId,
        actionType: 'read',
      });

      try {
        const [coreStart, startPlugins] = await core.getStartServices();
        const { security } = startPlugins;

        const accessResult = await checkWatchlistAccess({
          request,
          security,
          spaceId,
          type: 'read',
          action: 'read watchlist entity sources',
        });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const soClient = coreStart.savedObjects.getScopedClient(request, {
          includedHiddenTypes: [watchlistEntitySourceTypeName],
        });

        const watchlistClient = new WatchlistConfigClient({
          soClient,
          esClient: esClient.asCurrentUser,
          namespace: spaceId,
          logger,
        });
        const watchlist = await watchlistClient.get(params.watchlistId);

        const entitySourceClient = new WatchlistEntitySourceClient({
          soClient,
          namespace: spaceId,
          esClient: esClient.asCurrentUser,
          getStartServices: core.getStartServices,
          logger,
          hasEncryptionKey,
        });

        const sourceIds = await watchlistClient.getEntitySourceIds(params.watchlistId);
        const sources = sourceIds.length
          ? (await entitySourceClient.list({ per_page: sourceIds.length }, sourceIds)).sources
          : [];

        const dataSources = sources.map(toDataSourceSummary);

        telemetryTracker.recordResultCount(dataSources.length);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                watchlistId: params.watchlistId,
                watchlistName: watchlist.name,
                dataSources,
              },
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
              data: { message: `Error listing watchlist data sources: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};
