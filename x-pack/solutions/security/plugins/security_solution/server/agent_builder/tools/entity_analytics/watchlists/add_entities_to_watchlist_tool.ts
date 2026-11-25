/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { CRUDClient } from '@kbn/entity-store/server/domain/crud';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { getIndexForWatchlist } from '../../../../lib/entity_analytics/watchlists/entities/utils';
import { createManualEntityService } from '../../../../lib/entity_analytics/watchlists/entity_sources/manual/service';
import { WatchlistConfigClient } from '../../../../lib/entity_analytics/watchlists/management/watchlist_config';
import { resolveEntityIds, type UnresolvedEntityResult } from '../shared/resolve_entity_ids';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { securityTool } from '../../constants';
import { checkWatchlistAccess } from './check_watchlist_access';
import { formatEntityIdsForPrompt } from '../shared/entity_ids_preview';
import { getWatchlistToolAvailability } from './watchlist_availability';

const MAX_ENTITIES_PER_CALL = 100;

const schema = lazySchema(() =>
  z.object({
    watchlistId: z
      .string()
      .min(1)
      .describe(
        'The id of the watchlist to add entities to. Use `security.list_watchlists` to resolve a watchlist name to its id first, passing `nameContains` when the user referred to the watchlist by name.'
      ),
    entityIds: z
      .array(z.string().min(1))
      .min(1)
      .max(MAX_ENTITIES_PER_CALL)
      .describe(
        `Entity references to add. Accepts an EUID, canonical entity.name, or user.full_name. Each reference is resolved to a canonical entity.id before confirmation. Prefer \`entity.id\` from \`security.search_entities\` when you already have it. Do not invent an id by prefixing \`user:\` or \`host:\` onto a display name. Up to ${MAX_ENTITIES_PER_CALL} per call; for larger sets, direct the user to the CSV upload in the UI.`
      ),
  })
);

interface ResolvedWatchlistEntitiesState {
  resolved: string[];
  unresolved: UnresolvedEntityResult[];
}

export const SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID = securityTool('add_entities_to_watchlist');

export const addEntitiesToWatchlistTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID,
    type: ToolType.builtin,
    description: `Add one or more entities to an Entity Analytics watchlist. Requires user confirmation before the change is applied. Entity references (EUID, canonical entity.name, or user.full_name) are resolved to canonical entity.id values first. The confirmation lists only the ids that will be added.

Use when the user asks to add entities to a named or known watchlist (e.g. "add these users to the Privileged Users watchlist", "put host:server01 on watchlist X"). Resolve the watchlist id via \`security.list_watchlists\` first when the user named the watchlist. Pass the user's references as given, or each \`entity.id\` from \`security.search_entities\`. Do not construct an id as \`user:<user.name>\` or \`host:<host.name>\`.

If nothing resolves and any reference is ambiguous, no confirmation is shown. Ask the user to pick a candidate entity id and call this tool again. References that do not resolve are returned as \`unresolvedReferences\` and are not added. After the user confirms, report how many entities were added and any \`unresolvedReferences\`.`,
    schema,
    tags: ['security', 'entity-analytics', 'watchlists'],
    annotations: {
      title: 'Add Entities to Watchlist',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
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
    handler: async (
      params,
      { spaceId, esClient, savedObjectsClient, request, prompts, callContext, stateManager }
    ) => {
      logger.debug(
        `${SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID} tool called with parameters ${JSON.stringify(
          params
        )}`
      );

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID,
        spaceId,
        actionType: 'mutation',
      });
      telemetryTracker.recordResultCount(0);

      try {
        const [, startPlugins] = await core.getStartServices();
        const { security } = startPlugins;

        const accessResult = await checkWatchlistAccess({
          request,
          security,
          spaceId,
          type: 'write',
          action: 'modify watchlist membership',
        });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const watchlistClient = new WatchlistConfigClient({
          soClient: savedObjectsClient,
          esClient: esClient.asCurrentUser,
          namespace: spaceId,
          logger,
        });
        const watchlist = await watchlistClient.get(params.watchlistId);

        const promptId = `watchlists.add_entities_to_watchlist.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);
        telemetryTracker.recordConfirmationStatus(status);

        if (status === ConfirmationStatus.rejected) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: 'User declined to add entities to the watchlist.' },
              },
            ],
          };
        }

        // 4. If the user accepted the action, proceed with actual adding entities to the watchlist
        if (status === ConfirmationStatus.accepted) {
          const saved = stateManager.getState<ResolvedWatchlistEntitiesState>();
          if (!saved || saved.resolved.length === 0) {
            const message = 'Resolved entities state not found.';
            telemetryTracker.recordFailure(message);
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.error,
                  data: { message },
                },
              ],
            };
          }

          const service = createManualEntityService({
            esClient: esClient.asCurrentUser,
            crudClient: new CRUDClient({
              logger,
              esClient: esClient.asCurrentUser,
              namespace: spaceId,
            }),
            logger,
            watchlist: {
              name: watchlist.name,
              id: watchlist.id ?? params.watchlistId,
              index: getIndexForWatchlist(spaceId),
            },
          });
          const result = await service.assign(saved.resolved);
          const unresolved = saved.unresolved;

          telemetryTracker.recordResultCount(result.successful);
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  watchlistId: params.watchlistId,
                  watchlistName: watchlist.name,
                  ...result,
                  ...(unresolved.length > 0 ? { unresolvedReferences: unresolved } : {}),
                },
              },
            ],
          };
        }

        // 1. See if the provided entity ids can be resolved to an EUID
        const { resolved, unresolved } = await resolveEntityIds({
          esClient: esClient.asCurrentUser,
          spaceId,
          entityIds: params.entityIds,
        });
        const resolvedEuids = [...new Set(resolved.map((entry) => entry.euid))];

        // 2. If no entities can be resolved, do not proceed
        if (resolvedEuids.length === 0) {
          // 2.1. If any of the entities are ambiguous, ask the user to pick a candidate entity id and call this tool again
          if (unresolved.some((entry) => entry.status === 'ambiguous')) {
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    message:
                      'None of the given entities could be resolved to a single canonical id. Ask the user to pick an entity id (EUID) for each ambiguous reference, then call this tool again.',
                    unresolvedReferences: unresolved,
                  },
                },
              ],
            };
          }

          // 2.2. If no ambiguous entities, just report the failure
          const message = 'None of the given entities could be resolved to a canonical id.';
          telemetryTracker.recordFailure(message);
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message,
                  metadata: { unresolvedReferences: unresolved },
                },
              },
            ],
          };
        }

        // 3. If we have known entities, prompt the user for confirmation before adding them to the watchlist
        stateManager.setState<ResolvedWatchlistEntitiesState>({
          resolved: resolvedEuids,
          unresolved,
        });

        const noun = resolvedEuids.length === 1 ? 'entity' : 'entities';
        const unresolvedNoun = unresolved.length === 1 ? 'entity' : 'entities';
        telemetryTracker.recordAwaitingConfirmation();
        return prompts.askForConfirmation({
          id: promptId,
          title: 'Add entities to watchlist',
          message: [
            `Add ${resolvedEuids.length} ${noun} to the watchlist "${watchlist.name}"?`,
            '',
            formatEntityIdsForPrompt(resolvedEuids),
            ...(unresolved.length > 0
              ? [
                  '',
                  `${unresolved.length} ${unresolvedNoun} could not be resolved and will not be added.`,
                ]
              : []),
          ].join('\n'),
          confirm_text: 'Add',
          cancel_text: 'Cancel',
          color: 'primary',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        telemetryTracker.recordFailure(errorMessage);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error adding entities to watchlist: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};
