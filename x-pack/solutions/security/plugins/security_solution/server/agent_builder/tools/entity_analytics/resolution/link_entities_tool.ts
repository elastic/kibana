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
import { NAMESPACE_PRIORITY, selectTarget, type ResolutionClient } from '@kbn/entity-store/server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import { IdentifierType } from '../../../../../common/api/entity_analytics/common/common.gen';
import { RESOLUTION_GROUP_UPDATED_TOOL_EVENT } from '../../../../../common/entity_analytics/tool_events';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { securityTool } from '../../constants';
import { requireResolvedEntity } from '../entity_resolution';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { checkResolutionAccess } from './check_resolution_access';
import { formatEntityIdsForPrompt } from '../shared/entity_ids_preview';
import {
  resolveEntityIds,
  type ResolvedEntityResult,
  type UnresolvedEntityResult,
} from '../shared/resolve_entity_ids';
import { getResolutionToolAvailability } from './resolution_availability';

const MAX_ENTITIES_PER_CALL = 100;

type TargetSelectionReason = 'existing_group_target' | 'namespace_priority' | 'alphabetical';

interface ResolvedEntitiesState {
  targetEuid: string;
  targetSelection: 'user' | 'suggested';
  targetSelectionReason?: TargetSelectionReason;
  /** The namespace that decided a `namespace_priority` pick. */
  targetNamespace?: string;
  resolved: string[];
  unresolved: UnresolvedEntityResult[];
}

const schema = z.object({
  targetId: z
    .string()
    .min(1)
    .describe(
      'The entity to link the others to (becomes the resolution group target). Accepts the id (EUID), canonical entity.name, or user.full_name. Set this ONLY when the user named the target. Omit it otherwise and the tool proposes one; never guess a value.'
    )
    .optional(),
  targetType: IdentifierType.describe(
    'The entity type of `targetId`: host, user, service, or generic. Optional — helps disambiguate when `targetId` is a bare name.'
  ).optional(),
  entityIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_ENTITIES_PER_CALL)
    .describe(
      `Entities to link to the target, becoming its aliases. When \`targetId\` is omitted, list every entity to merge here (at least two) and the tool picks which one becomes the target. Accepts EUIDs, canonical entity.name, or user.full_name values. Up to ${MAX_ENTITIES_PER_CALL} per call; for larger bulk merges, direct the user to the CSV import in the UI.`
    ),
});

export const SECURITY_LINK_ENTITIES_TOOL_ID = securityTool('link_entities');

export const linkEntitiesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_LINK_ENTITIES_TOOL_ID,
    type: ToolType.builtin,
    description: `Link one or more entities to a target entity, creating (or extending) an entity resolution group. Requires user confirmation before the change is applied. All entities involved (the target and every id in \`entityIds\`) must be the same entity type.

Use when the user asks to merge, link, or resolve entities together (e.g. "link these two accounts", "merge host:laptop-a into host:laptop-b", "these are the same user, resolve them"). Entity references are resolved to canonical EUIDs automatically — pass names or ids as the user gave them.

When the user does not say which entity should be the target, omit \`targetId\` and list all the entities in \`entityIds\`. The tool proposes the target itself, preferring an entity that already heads a resolution group, and reports why in \`targetSelectionReason\`: \`existing_group_target\`; \`namespace_priority\` when one candidate's identity provider outranked every other (the deciding namespace is in \`targetNamespace\`); or \`alphabetical\` when nothing separated the candidates — several shared the top namespace, or none had one — and the first id alphabetically won. Report \`alphabetical\` as an arbitrary pick, not as a namespace win. The proposal is shown in the confirmation prompt and reported back as \`targetSelection: 'suggested'\`; if the user declines and names a different target, call again with \`targetId\`. If a target cannot be proposed (fewer than two linkable entities, or more than one of them already heads a group), the tool asks for \`targetId\` instead.

An entity that already has aliases cannot itself become an alias. If any entity in \`entityIds\` heads a group, the tool reports them in \`groupTargets\` and makes no change; the message says what to offer the user. This tool never merges two existing resolution groups.

Entity references that don't resolve to a canonical id are excluded from the batch and reported back, not treated as an error. Beyond that, the call is all-or-nothing: a validation failure on a resolved entity rejects the whole batch with an error (the message states why). Entities already linked to this exact target are reported as \`skipped\`, not an error. This tool only changes resolution-group membership — it does not itself recalculate risk scores (that happens separately, next time scoring runs).`,
    schema,
    tags: ['security', 'entity-store', 'entity-analytics', 'resolution'],
    annotations: {
      title: 'Link Entities',
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
        `${SECURITY_LINK_ENTITIES_TOOL_ID} tool called with parameters ${JSON.stringify(params)}`
      );

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_LINK_ENTITIES_TOOL_ID,
        spaceId,
        actionType: 'mutation',
        entityTypes: params.targetType ? [params.targetType] : [],
      });
      telemetryTracker.recordResultCount(0);

      try {
        const [, startPlugins] = await core.getStartServices();
        const { security, entityStore } = startPlugins;
        const accessResult = await checkResolutionAccess({
          request,
          security,
          action: 'link entities',
        });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const client = esClient.asCurrentUser;
        const promptId = `resolution.link_entities.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);
        telemetryTracker.recordConfirmationStatus(status);

        if (status === ConfirmationStatus.rejected) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: 'User declined to link the entities.' },
              },
            ],
          };
        }

        if (status === ConfirmationStatus.accepted) {
          const saved = stateManager.getState<ResolvedEntitiesState>();
          if (!saved) {
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
          const result = await resolutionClient.linkEntities(saved.targetEuid, saved.resolved, {
            awaitVisibility: true,
          });
          const unresolved = saved.unresolved ?? [];

          telemetryTracker.recordResultCount(result.linked.length);
          events.sendUiEvent(RESOLUTION_GROUP_UPDATED_TOOL_EVENT, {});
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  targetId: result.target_id,
                  targetSelection: saved.targetSelection,
                  ...(saved.targetSelectionReason
                    ? { targetSelectionReason: saved.targetSelectionReason }
                    : {}),
                  ...(saved.targetNamespace ? { targetNamespace: saved.targetNamespace } : {}),
                  entityType: result.entity_type,
                  linked: result.linked,
                  skipped: result.skipped,
                  ...(unresolved.length > 0 ? { unresolvedReferences: unresolved } : {}),
                },
              },
            ],
          };
        }

        let explicitTargetEuid: string | undefined;
        if (params.targetId) {
          const resolvedTarget = await requireResolvedEntity({
            esClient: client,
            spaceId,
            entityId: params.targetId,
            entityType: params.targetType,
          });
          if (!resolvedTarget.ok) {
            if (resolvedTarget.result.type === ToolResultType.error) {
              telemetryTracker.recordFailure(resolvedTarget.result.data.message);
            }
            return { results: [resolvedTarget.result] };
          }
          explicitTargetEuid = resolvedTarget.identity.entityStoreId;
        }

        const { resolved, unresolved } = await resolveEntityIds({
          esClient: client,
          spaceId,
          entityIds: params.entityIds,
        });

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

        // An entity that already heads a resolution group cannot become an alias, so it
        // constrains both a proposed target and an explicitly named one.
        const aliasesByGroupTarget = await findExistingGroupTargets(
          resolved,
          explicitTargetEuid,
          entityStore.createResolutionClient(client, spaceId)
        );

        // Every entity other than the target has to become an alias, so none of them may head
        // a group of its own. Only reachable when the user named the target: `suggestLinkTarget`
        // proposes a target only when it is the batch's sole group head.
        if (explicitTargetEuid) {
          const blockedGroupTargets = resolved
            .map(({ euid }) => euid)
            .filter((euid) => euid !== explicitTargetEuid && aliasesByGroupTarget.has(euid));

          if (blockedGroupTargets.length > 0) {
            const blocked = blockedGroupTargets.map((euid) => `\`${euid}\``).join(', ');
            // Reversing the roles only helps when the named target can still become an alias;
            // if it heads a group too, the retry would hit this same guard.
            const canReverse =
              blockedGroupTargets.length === 1 && !aliasesByGroupTarget.has(explicitTargetEuid);
            const message = canReverse
              ? `Cannot link to \`${explicitTargetEuid}\`: ${blocked} already heads a resolution group of its own, and an entity that has aliases cannot itself become an alias. Tell the user and offer both ways out: link \`${explicitTargetEuid}\` into that group instead (call this tool again with ${blocked} as \`targetId\`, which makes it the canonical entity rather than \`${explicitTargetEuid}\`), or unlink that group's aliases first if \`${explicitTargetEuid}\` has to stay canonical.`
              : `Cannot link to \`${explicitTargetEuid}\`: ${blocked} ${
                  blockedGroupTargets.length === 1
                    ? 'already heads a resolution group of its own'
                    : 'each already head a resolution group of their own'
                }, and an entity that has aliases cannot itself become an alias. This tool cannot merge existing resolution groups. Tell the user that the aliases of all but one of the groups involved have to be unlinked first.`;
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    message,
                    groupTargets: blockedGroupTargets.map((euid) => ({
                      euid,
                      aliases: aliasesByGroupTarget.get(euid) ?? [],
                    })),
                    ...(unresolved.length > 0 ? { unresolvedReferences: unresolved } : {}),
                  },
                },
              ],
            };
          }
        }

        // When the user did not name a target, propose one
        let targetEuid = explicitTargetEuid;
        let targetSelectionReason: TargetSelectionReason | undefined;
        let targetNamespace: string | undefined;
        if (!targetEuid) {
          const proposal = suggestLinkTarget(resolved, aliasesByGroupTarget);
          if (!proposal.ok) {
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    message: NO_TARGET_PROPOSAL_MESSAGE[proposal.reason],
                    ...(proposal.reason === 'multiple_group_targets'
                      ? { groupTargets: proposal.groupTargets }
                      : {}),
                    ...(unresolved.length > 0 ? { unresolvedReferences: unresolved } : {}),
                  },
                },
              ],
            };
          }
          targetEuid = proposal.target.euid;
          targetSelectionReason = proposal.reason;
          if (proposal.reason === 'namespace_priority') {
            targetNamespace = proposal.target.namespace;
          }
        }

        const targetSelection = explicitTargetEuid ? 'user' : 'suggested';
        // A suggested target comes from `resolved`, so it must not also be linked to itself
        const resolvedEuids = resolved
          .map((entry) => entry.euid)
          .filter((euid) => explicitTargetEuid || euid !== targetEuid);

        stateManager.setState<ResolvedEntitiesState>({
          targetEuid,
          targetSelection,
          ...(targetSelectionReason ? { targetSelectionReason } : {}),
          ...(targetNamespace ? { targetNamespace } : {}),
          resolved: resolvedEuids,
          unresolved,
        });

        // HITL confirmation prompt
        const noun = resolvedEuids.length === 1 ? 'entity' : 'entities';
        telemetryTracker.recordAwaitingConfirmation();
        return prompts.askForConfirmation({
          id: promptId,
          title: 'Link entities',
          message: [
            `Link ${resolvedEuids.length} ${noun} to \`${targetEuid}\` as aliases?`,
            '',
            formatEntityIdsForPrompt(resolvedEuids),
          ].join('\n'),
          confirm_text: 'Link',
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
              data: { message: `Error linking entities: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};

type LinkTargetProposal =
  | { ok: true; target: ResolvedEntityResult; reason: TargetSelectionReason }
  | { ok: false; reason: 'insufficient_candidates' }
  | { ok: false; reason: 'multiple_group_targets'; groupTargets: string[] };

type NoTargetProposalReason = Extract<LinkTargetProposal, { ok: false }>['reason'];

const NO_TARGET_PROPOSAL_MESSAGE: Record<NoTargetProposalReason, string> = {
  insufficient_candidates:
    'No target was given and one cannot be proposed: at least two of the entities must resolve and not already be aliases. Ask the user which entity should be the target, then call this tool again with `targetId`.',
  multiple_group_targets:
    'No target was given and one cannot be proposed: more than one of the entities already heads a resolution group (see `groupTargets`), and a group cannot be linked into another group here. Ask the user which of them should be the target, then call this tool again with `targetId`.',
};

/**
 * Looks up which of the given entities already head a resolution group, mapped to their
 * current aliases. Resolved entities that are themselves aliases are excluded: they can
 * never be a group target. These are existing groups, not the target of this link operation.
 */
const findExistingGroupTargets = async (
  resolved: readonly ResolvedEntityResult[],
  explicitTargetEuid: string | undefined,
  resolutionClient: ResolutionClient
): Promise<Map<string, string[]>> => {
  const euids = resolved.filter(({ resolvedTo }) => !resolvedTo).map(({ euid }) => euid);
  if (explicitTargetEuid && !euids.includes(explicitTargetEuid)) {
    euids.push(explicitTargetEuid);
  }
  if (euids.length === 0) {
    return new Map();
  }
  return resolutionClient.findEntitiesWithAliases(euids);
};

/**
 * Picks the entity that should become the group target when the user did not name one.
 * An entity that already heads a group is the only legal target in the batch, so it wins
 * outright; when none does, selection falls back to the entity store's shared namespace
 * priority. Returns why it could not propose one when the batch has fewer than two
 * linkable entities or more than one existing group target.
 */
const suggestLinkTarget = (
  entities: readonly ResolvedEntityResult[],
  aliasesByGroupTarget: ReadonlyMap<string, string[]>
): LinkTargetProposal => {
  const candidates = entities.filter(({ resolvedTo }) => !resolvedTo);
  if (candidates.length < 2) {
    return { ok: false, reason: 'insufficient_candidates' };
  }

  const groupTargets = candidates.filter(({ euid }) => aliasesByGroupTarget.has(euid));
  if (groupTargets.length > 1) {
    return {
      ok: false,
      reason: 'multiple_group_targets',
      groupTargets: groupTargets.map(({ euid }) => euid),
    };
  }
  if (groupTargets.length === 1) {
    return { ok: true, target: groupTargets[0], reason: 'existing_group_target' };
  }

  const ranked = candidates.map((entity) => ({
    ...entity,
    entityId: entity.euid,
    namespace: entity.namespace ?? '',
  }));
  const target = selectTarget(ranked);

  const isPrioritised = NAMESPACE_PRIORITY.some((namespace) => namespace === target.namespace);
  const sharingNamespace = ranked.filter(({ namespace }) => namespace === target.namespace);

  return {
    ok: true,
    target,
    reason: isPrioritised && sharingNamespace.length === 1 ? 'namespace_priority' : 'alphabetical',
  };
};
