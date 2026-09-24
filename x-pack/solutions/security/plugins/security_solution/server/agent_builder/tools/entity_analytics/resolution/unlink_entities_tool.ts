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
import { requireResolvedEntity } from '../entity_resolution';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { checkResolutionAccess } from './check_resolution_access';
import { formatUnlinkTargetsForPrompt } from './entity_ids_preview';
import {
  resolveEntityIdsForResolution,
  type ResolvedEntityResult,
  type UnresolvedEntityResult,
} from './resolve_entity_ids';
import { getResolutionToolAvailability } from './resolution_availability';

const MAX_ENTITIES_PER_CALL = 100;

interface ResolvedEntitiesState {
  resolved: ResolvedEntityResult[];
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
  groupEntityId: z
    .string()
    .min(1)
    .describe(
      `
      The entity ID of another entity from the group every entity in \`entityIds\` is expected to be unlinked from.
      Set this ONLY when the user explicitly named it. Omit it entirely when the user just said "unlink X"; never guess a value.
      Examples:
        1. "unlink bob.temp from bob.admin": entityId = ["bob.temp"] and groupEntityId = "bob.admin"
        2. "bob.temp and bob.old do not belong with bob.admin": entityId = ["bob.temp", "bob.old"] and groupEntityId = "bob.admin"
        3. "unlink X": entityId = ["X"] and omit groupEntityId
      \`groupEntityId\` can be any member of the entity resolution group; it does not have to be the group target.
    `
    )
    .optional(),
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

When the user names what to unlink *from* ("unlink bob.temp from bob.admin"), pass it as \`groupEntityId\` so every entity in the batch is verified to be in that group first. If any of them turns out not to be in that group — either because it belongs to a different one or because it is not linked to anything — nothing is unlinked and those entities are reported back in \`groupMismatches\`, each with the \`reason\` it did not match, so you can check with the user. One call handles one group — to unlink from several groups, make a separate call per group.

Entity references that don't resolve to a canonical id are excluded from the batch and reported back, not treated as an error. Beyond that, the call is all-or-nothing: an unlinking failure rejects the whole batch with an error (the message states why). Entities that are not currently an alias of anything (i.e. not linked) are reported as \`skipped\`, not an error; if none of the entities are linked there is nothing to unlink, so that is reported back immediately without asking for confirmation. This tool only unlinks — it does not affect any other members remaining in the group.`,
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
        // 1. Check if the user has permission to use this tool
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

        // 8. If the user rejected the confirmation, return an error
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

        // 9. If the user accepted the confirmation, proceed with the actual unlinking action
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

          const entitiesIds = resolvedEntities.resolved.map((entity) => entity.euid);
          const resolutionClient = entityStore.createResolutionClient(client, spaceId);
          const result = await resolutionClient.unlinkEntities(entitiesIds, {
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

        // 2. Resolve the group entity if provided to its EUID and normalize it to the group target
        let resolvedGroupEntityId: string | undefined;
        let groupTargetId: string | undefined;
        if (params.groupEntityId) {
          const resolvedGroup = await requireResolvedEntity({
            esClient: client,
            spaceId,
            entityId: params.groupEntityId,
          });
          if (!resolvedGroup.ok) {
            if (resolvedGroup.result.type === ToolResultType.error) {
              telemetryTracker.recordFailure(resolvedGroup.result.data.message);
            }
            return { results: [resolvedGroup.result] };
          }
          resolvedGroupEntityId = resolvedGroup.identity.entityStoreId;
          groupTargetId = resolvedGroup.identity.resolvedTo ?? resolvedGroupEntityId;
        }

        // 3. Resolve the entities to be unlinked to their EUIDs
        const { resolved, unresolved } = await resolveEntityIdsForResolution({
          esClient: client,
          spaceId,
          entityIds: params.entityIds,
        });
        stateManager.setState<ResolvedEntitiesState>({ resolved, unresolved });

        // 4. If none of the entities could be resolved, do not proceed with the unlinking action
        if (resolved.length === 0) {
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

        // 5. If nothing in the batch is actually an alias, unlinking is a no-op. Report it
        // instead of asking the user to confirm a change that would do nothing.
        if (resolved.every((entity) => !entity.resolvedTo)) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  message:
                    'None of the given entities are currently linked to a resolution group, so there is nothing to unlink.',
                  unlinked: [],
                  skipped: resolved.map((entity) => entity.euid),
                  ...(unresolved.length > 0 ? { unresolvedReferences: unresolved } : {}),
                },
              },
            ],
          };
        }

        // 6. Check if the entities are from the group the user named. If not it might be a mistake, so we need to report it to the user
        if (groupTargetId) {
          const groupMismatches = resolved
            .filter((entity) => entity.resolvedTo !== groupTargetId)
            .map((entity) =>
              entity.resolvedTo
                ? { euid: entity.euid, resolvedTo: entity.resolvedTo, reason: 'different_group' }
                : { euid: entity.euid, reason: 'not_linked' }
            );

          if (groupMismatches.length > 0) {
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    message: `Some of the given entities are not in the resolution group of "${resolvedGroupEntityId}" (target "${groupTargetId}"). For entries with reason "different_group", tell the user which group the entity is actually in (\`resolvedTo\`) and ask whether to unlink it from that group instead. For entries with reason "not_linked", the entity is not linked to anything and is already standalone, so there is nothing to unlink for it.`,
                    groupMismatches,
                  },
                },
              ],
            };
          }
        }

        // 7. Since unlinking is a mutation action, ask the user for confirmation before proceeding
        const noun = resolved.length === 1 ? 'entity' : 'entities';
        const groupNoun =
          resolved.length === 1 ? 'its resolution group' : 'their resolution groups';
        telemetryTracker.recordAwaitingConfirmation();
        return prompts.askForConfirmation({
          id: promptId,
          title: 'Unlink entities',
          message: [
            `Unlink ${resolved.length} ${noun} from ${groupNoun}?`,
            '',
            formatUnlinkTargetsForPrompt(resolved),
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
