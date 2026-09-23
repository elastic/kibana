/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { securityTool } from '../../constants';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { checkResolutionAccess } from './check_resolution_access';
import { formatEntityIdsForPrompt } from './entity_ids_preview';
import { resolveEntityIdsForResolution, type UnresolvedEntityResult } from './resolve_entity_ids';
import { getResolutionToolAvailability } from './resolution_availability';

const MAX_ENTITIES_PER_CALL = 100;

interface ResolvedEntitiesState {
  euids: string[];
  unresolved: UnresolvedEntityResult[];
}

const schema = z.object({
  entityIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_ENTITIES_PER_CALL)
    .describe(
      `Entities (aliases) to unlink from their resolution group, making them standalone entities again. Accepts EUIDs, canonical entity.name, or user.full_name values. Up to ${MAX_ENTITIES_PER_CALL} per call.`
    ),
});

export const SECURITY_UNLINK_ENTITIES_TOOL_ID = securityTool('unlink_entities');

export const unlinkEntitiesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_UNLINK_ENTITIES_TOOL_ID,
    type: ToolType.builtin,
    description: `Unlink one or more entities from their resolution group, removing their alias link so each becomes a standalone entity again. Requires user confirmation before the change is applied.

Use when the user asks to unmerge, unlink, or split entities that were previously resolved together (e.g. "unlink this alias", "these shouldn't be merged, split them apart"). Entity references are resolved to canonical EUIDs automatically — pass names or ids as the user gave them.

Entity references that don't resolve to a canonical id are excluded from the batch and reported back, not treated as an error. Beyond that, the call is all-or-nothing: an unlinking failure rejects the whole batch with an error (the message states why). Entities that are not currently an alias of anything (i.e. not linked) are reported as \`skipped\`, not an error. This tool only unlinks — it does not affect any other members remaining in the group.`,
    schema,
    tags: ['security', 'entity-store', 'entity-analytics', 'resolution'],
    annotations: {
      title: 'Unlink Entities',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) =>
        getResolutionToolAvailability({ core, request, spaceId, experimentalFeatures, logger }),
    },
    handler: async (params, { spaceId, esClient, prompts, callContext, request, stateManager }) => {
      logger.debug(
        `${SECURITY_UNLINK_ENTITIES_TOOL_ID} tool called with parameters ${JSON.stringify(params)}`
      );

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_UNLINK_ENTITIES_TOOL_ID,
        spaceId,
        actionType: 'mutation',
      });
      telemetryTracker.recordResultCount(0);

      try {
        const [, startPlugins] = await core.getStartServices();
        const { security, entityStore } = startPlugins;
        const accessResult = await checkResolutionAccess({
          request,
          security,
          action: 'unlink entities',
        });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const client = esClient.asCurrentUser;
        const promptId = `resolution.unlink_entities.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);
        telemetryTracker.recordConfirmationStatus(status);

        if (status === ConfirmationStatus.rejected) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: 'User declined to unlink the entities.' },
              },
            ],
          };
        }

        if (status === ConfirmationStatus.accepted) {
          const resolvedEntities = stateManager.getState<ResolvedEntitiesState>();
          if (!resolvedEntities) {
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

          const resolutionClient = entityStore.createResolutionClient(client, spaceId);
          const result = await resolutionClient.unlinkEntities(resolvedEntities.euids, {
            awaitVisibility: true,
          });

          telemetryTracker.recordResultCount(result.unlinked.length);
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  entityType: result.entity_type,
                  unlinked: result.unlinked,
                  skipped: result.skipped,
                  ...(resolvedEntities.unresolved.length > 0
                    ? { unresolvedReferences: resolvedEntities.unresolved }
                    : {}),
                },
              },
            ],
          };
        }

        const { euids, unresolved } = await resolveEntityIdsForResolution({
          esClient: client,
          spaceId,
          entityIds: params.entityIds,
        });
        stateManager.setState<ResolvedEntitiesState>({ euids, unresolved });

        if (euids.length === 0) {
          // If any of the unresolved entities are ambiguous, return a ToolResultType.other so that the agent might prompt the user for resolving the ambiguity.
          if (unresolved.some((entry) => entry.status === 'ambiguous')) {
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    message:
                      'Some of the given entities could not be resolved to a canonical id. Ask the user to resolve the ambiguity and then call this tool again.',
                    unresolvedReferences: unresolved,
                  },
                },
              ],
            };
          }

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

        // HITL confirmation prompt
        const noun = euids.length === 1 ? 'entity' : 'entities';
        telemetryTracker.recordAwaitingConfirmation();
        return prompts.askForConfirmation({
          id: promptId,
          title: 'Unlink entities',
          message: [
            `Unlink ${euids.length} ${noun} from their resolution group?`,
            '',
            formatEntityIdsForPrompt(euids),
          ].join('\n'),
          confirm_text: 'Unlink',
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
              data: { message: `Error unlinking entities: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};
