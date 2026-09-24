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
import { IdentifierType } from '../../../../../common/api/entity_analytics/common/common.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { securityTool } from '../../constants';
import { requireResolvedEntity } from '../entity_resolution';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { checkResolutionAccess } from './check_resolution_access';
import { formatEntityIdsForPrompt } from './entity_ids_preview';
import { resolveEntityIdsForResolution, type UnresolvedEntityResult } from './resolve_entity_ids';
import { getResolutionToolAvailability } from './resolution_availability';

const MAX_ENTITIES_PER_CALL = 100;

interface ResolvedEntitiesState {
  targetEuid: string;
  resolved: string[];
  unresolved: UnresolvedEntityResult[];
}

const schema = z.object({
  targetId: z
    .string()
    .min(1)
    .describe(
      'The entity to link the others to (becomes the resolution group target). Accepts the id (EUID), canonical entity.name, or user.full_name.'
    ),
  targetType: IdentifierType.describe(
    'The entity type of `targetId`: host, user, service, or generic. Optional — helps disambiguate when `targetId` is a bare name.'
  ).optional(),
  entityIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_ENTITIES_PER_CALL)
    .describe(
      `Entities to link to the target, becoming its aliases. Accepts EUIDs, canonical entity.name, or user.full_name values. Up to ${MAX_ENTITIES_PER_CALL} per call; for larger bulk merges, direct the user to the CSV import in the UI.`
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

Entity references that don't resolve to a canonical id are excluded from the batch and reported back, not treated as an error. Beyond that, the call is all-or-nothing: a validation failure on a resolved entity rejects the whole batch with an error (the message states why). Entities already linked to this exact target are reported as \`skipped\`, not an error.`,
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
    handler: async (params, { spaceId, esClient, prompts, callContext, request, stateManager }) => {
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
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  targetId: result.target_id,
                  entityType: result.entity_type,
                  linked: result.linked,
                  skipped: result.skipped,
                  ...(unresolved.length > 0 ? { unresolvedReferences: unresolved } : {}),
                },
              },
            ],
          };
        }

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

        const { resolved, unresolved } = await resolveEntityIdsForResolution({
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

        const targetEuid = resolvedTarget.identity.entityStoreId;
        const resolvedEuids = resolved.map((entry) => entry.euid);
        stateManager.setState<ResolvedEntitiesState>({
          targetEuid,
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
            `Link ${resolvedEuids.length} ${noun} to "${targetEuid}" as aliases?`,
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
