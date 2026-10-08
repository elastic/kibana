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
import type { ResolutionClient } from '@kbn/entity-store/server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import { RESOLUTION_GROUP_UPDATED_TOOL_EVENT } from '../../../../../common/entity_analytics/tool_events';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { securityTool } from '../../constants';
import { requireResolvedEntity } from '../entity_resolution';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { checkResolutionAccess } from './check_resolution_access';
import {
  resolveEntityIdsForResolution,
  type ResolvedEntityResult,
  type UnresolvedEntityResult,
} from './resolve_entity_ids';
import { getResolutionToolAvailability } from './resolution_availability';

const MAX_ENTITIES_PER_CALL = 100;

/**
 * A resolved entity that is not an alias, so it cannot be unlinked: either it is not part of
 * any group, or it is the target (primary) of one.
 */
type NonAliasEntity =
  | { euid: string; kind: 'standalone' }
  | { euid: string; kind: 'group_target'; aliases: string[] };

interface ResolvedEntitiesState {
  resolved: ResolvedEntityResult[];
  unresolved: UnresolvedEntityResult[];
  nonAliases: NonAliasEntity[];
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

When the user names what to unlink *from* ("unlink bob.temp from bob.admin"), pass it as \`groupEntityId\` so every entity in the batch is verified to be in that group first. If any of them turns out not to be in that group — either because it belongs to a different one or because it is not an alias (it is standalone, reason \`standalone\`, or the target of a group, reason \`group_target\`) — nothing is unlinked and those entities are reported back in \`groupMismatches\`, each with the \`reason\` it did not match, so you can check with the user. One call handles one group — to unlink from several groups, make a separate call per group.

Entity references that don't resolve to a canonical id are excluded from the batch and reported back, not treated as an error. Beyond that, the call is all-or-nothing: an unlinking failure rejects the whole batch with an error (the message states why). Entities that are not currently an alias of anything are reported as \`skipped\`, not an error, and described in \`nonAliases\`: \`kind: 'standalone'\` (not part of any group) or \`kind: 'group_target'\` (the primary of a group, with its \`aliases\`). A group target cannot be unlinked: tell the user it is the primary of a group and offer to unlink some of its listed aliases instead. If none of the entities is an alias there is nothing to unlink, so that is reported back immediately without asking for confirmation. This tool only unlinks — it does not affect any other members remaining in the group, and it does not itself recalculate risk scores (that happens separately, next time scoring runs).`,
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
    handler: async (
      params,
      { spaceId, esClient, prompts, callContext, request, stateManager, events }
    ) => {
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

          const skippedNonAliases = resolvedEntities.nonAliases.filter(({ euid }) =>
            result.skipped.includes(euid)
          );

          telemetryTracker.recordResultCount(result.unlinked.length);
          events.sendUiEvent(RESOLUTION_GROUP_UPDATED_TOOL_EVENT, {});
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  entityType: result.entity_type,
                  unlinked: result.unlinked,
                  skipped: result.skipped,
                  ...(skippedNonAliases.length > 0 ? { nonAliases: skippedNonAliases } : {}),
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

        // 5. Get the classified non-alias entities to inform the user if they are not part of any group or the primary of a group
        const nonAliases = await getNonAliasEntities(
          resolved,
          entityStore.createResolutionClient(client, spaceId)
        );

        stateManager.setState<ResolvedEntitiesState>({ resolved, unresolved, nonAliases });

        // 6. If nothing in the batch is actually an alias, unlinking is a no-op. Report it
        // instead of asking the user to confirm a change that would do nothing.
        if (resolved.every((entity) => !entity.resolvedTo)) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  message:
                    'None of the given entities is an alias in a resolution group, so there is nothing to unlink. See `nonAliases`: an entity of kind "standalone" is not part of any group; one of kind "group_target" is the primary of a group and cannot be unlinked, so tell the user and offer to unlink some of its listed `aliases` instead.',
                  unlinked: [],
                  skipped: resolved.map((entity) => entity.euid),
                  nonAliases,
                  ...(unresolved.length > 0 ? { unresolvedReferences: unresolved } : {}),
                },
              },
            ],
          };
        }

        // 7. Check if the entities are from the group the user named. If not it might be a mistake, so we need to report it to the user
        if (groupTargetId) {
          const nonAliasByEuid = new Map(nonAliases.map((entity) => [entity.euid, entity]));
          const groupMismatches = resolved
            .filter((entity) => entity.resolvedTo !== groupTargetId)
            .map((entity) => {
              if (entity.resolvedTo) {
                return {
                  euid: entity.euid,
                  resolvedTo: entity.resolvedTo,
                  reason: 'different_group',
                };
              }
              const nonAlias = nonAliasByEuid.get(entity.euid);
              return nonAlias?.kind === 'group_target'
                ? {
                    euid: entity.euid,
                    reason: nonAlias.kind,
                    aliases: nonAlias.aliases,
                  }
                : { euid: entity.euid, reason: 'standalone' };
            });

          if (groupMismatches.length > 0) {
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    message: `Some of the given entities are not in the resolution group of "${resolvedGroupEntityId}" (target "${groupTargetId}"). For entries with reason "different_group", tell the user which group the entity is actually in (\`resolvedTo\`) and ask whether to unlink it from that group instead. For entries with reason "standalone", the entity is not linked to anything, so there is nothing to unlink for it. For entries with reason "group_target", the entity is the primary of a group and cannot be unlinked: tell the user, and offer to unlink some of its listed \`aliases\` instead`,
                    groupMismatches,
                  },
                },
              ],
            };
          }
        }

        // 8. Since unlinking is a mutation action, ask the user for confirmation before proceeding
        const aliases = resolved.filter(({ resolvedTo }) => resolvedTo);
        const noun = aliases.length === 1 ? 'entity' : 'entities';
        const groupNoun = aliases.length === 1 ? 'its resolution group' : 'their resolution groups';
        telemetryTracker.recordAwaitingConfirmation();
        return prompts.askForConfirmation({
          id: promptId,
          title: 'Unlink entities',
          message: [
            `Unlink ${aliases.length} ${noun} from ${groupNoun}?`,
            '',
            formatUnlinkTargetsForPrompt(aliases),
            ...(nonAliases.length > 0 ? ['', formatSkippedEntitiesForPrompt(nonAliases)] : []),
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

/**
 * Finds out, for the resolved entities that are not aliases, whether each one is standalone or the target of a group.
 */
const getNonAliasEntities = async (
  resolved: readonly ResolvedEntityResult[],
  resolutionClient: ResolutionClient
): Promise<NonAliasEntity[]> => {
  const euids = resolved.filter(({ resolvedTo }) => !resolvedTo).map(({ euid }) => euid);
  if (euids.length === 0) {
    return [];
  }

  const aliasesByTarget = await resolutionClient.findEntitiesWithAliases(euids);
  return euids.map((euid): NonAliasEntity => {
    const aliases = aliasesByTarget.get(euid) ?? [];
    return aliases.length > 0
      ? { euid, kind: 'group_target', aliases }
      : { euid, kind: 'standalone' };
  });
};

const ENTITY_PREVIEW_LIMIT = 10;
/**
 * Render EUIDs alongside the resolution group target each one is currently linked to,
 * so the user confirms against the group actually being modified rather than the alias
 * name alone.
 */
const formatUnlinkTargetsForPrompt = (aliases: readonly ResolvedEntityResult[]): string => {
  const shown = aliases.slice(0, ENTITY_PREVIEW_LIMIT);
  const lines = shown.map(
    (entity) => `- \`${entity.euid}\` — currently linked to \`${entity.resolvedTo}\``
  );

  const remaining = aliases.length - shown.length;
  if (remaining > 0) {
    lines.push(`- … and ${remaining} more`);
  }
  return lines.join('\n');
};

/** Summarizes the entities that will be skipped because they are not aliases, and why. */
const formatSkippedEntitiesForPrompt = (nonAliases: readonly NonAliasEntity[]): string => {
  const groupTargets = nonAliases.filter(({ kind }) => kind === 'group_target').length;
  const standalone = nonAliases.length - groupTargets;
  const countOf = (count: number): string => `${count} ${count === 1 ? 'entity' : 'entities'}`;

  return [
    `${countOf(nonAliases.length)} will be skipped:`,
    '',
    ...(groupTargets > 0
      ? [
          `- ${countOf(groupTargets)} ${
            groupTargets === 1 ? 'is a group primary' : 'are group primaries'
          }`,
        ]
      : []),
    ...(standalone > 0
      ? [
          `- ${countOf(standalone)} ${
            standalone === 1 ? 'is' : 'are'
          } not part of any resolution group`,
        ]
      : []),
  ].join('\n');
};
