/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { getFieldValue } from '@kbn/entity-store/server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import { IdentifierType } from '../../../../../common/api/entity_analytics/common/common.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { securityTool } from '../../constants';
import { requireResolvedEntity } from '../entity_resolution';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { checkResolutionAccess } from './check_resolution_access';
import { getResolutionToolAvailability } from './resolution_availability';

const schema = z.object({
  entityType: IdentifierType.describe(
    'The type of entity: host, user, service, or generic'
  ).optional(),
  entityId: z
    .string()
    .min(1)
    .describe(
      'The entity id (EUID), canonical entity.name, or user.full_name to look up the resolution group for. ' +
        'Examples: "host:server1" (prefixed EUID), "server1" (non-prefixed), "John Doe" (user.full_name).'
    ),
});

export const SECURITY_GET_RESOLUTION_GROUP_TOOL_ID = securityTool('get_resolution_group');

export const getResolutionGroupTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_GET_RESOLUTION_GROUP_TOOL_ID,
    type: ToolType.builtin,
    description: `Get the entity resolution group for an entity — the target plus every alias currently linked to it. Each member is projected to \`entityId\`, \`name\`, and \`entityType\` rather than the full entity document. Works whether the id/name you pass is the group's target or one of its aliases; both return the same group. Standalone entities (not linked to anything) return as their own target with an empty alias list.

Use when the user asks who/what an entity is resolved with or which entities are linked to it, e.g. "who is this user resolved with", "what aliases does host:server1 have", "which entities are linked to this user", "what does this account resolve to", "show the resolution group for host:server1". Read-only — does not modify anything.

When the reference is ambiguous or not found, the result explains why and (when applicable) lists candidate EUIDs to disambiguate — relay that to the user rather than guessing.`,
    schema,
    tags: ['security', 'entity-store', 'entity-analytics', 'resolution'],
    annotations: {
      title: 'Get Resolution Group',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) =>
        getResolutionToolAvailability({ core, request, spaceId, experimentalFeatures, logger }),
    },
    handler: async (params, { spaceId, esClient, request }) => {
      logger.debug(
        `${SECURITY_GET_RESOLUTION_GROUP_TOOL_ID} tool called with parameters ${JSON.stringify(
          params
        )}`
      );

      const { entityType, entityId } = params;
      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_GET_RESOLUTION_GROUP_TOOL_ID,
        spaceId,
        actionType: 'read',
        entityTypes: entityType ? [entityType] : [],
      });
      telemetryTracker.recordResultCount(0);

      try {
        const [, { security, entityStore }] = await core.getStartServices();
        const accessResult = await checkResolutionAccess({
          request,
          security,
          action: 'view entity resolution groups',
        });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const client = esClient.asCurrentUser;
        const resolved = await requireResolvedEntity({
          esClient: client,
          spaceId,
          entityId,
          entityType,
        });
        if (!resolved.ok) {
          if (resolved.result.type === ToolResultType.error) {
            telemetryTracker.recordFailure(resolved.result.data.message);
          }
          return { results: [resolved.result] };
        }

        const resolutionClient = entityStore.createResolutionClient(client, spaceId);
        const group = await resolutionClient.getResolutionGroup(resolved.identity.entityStoreId);

        telemetryTracker.recordResultCount(1);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                entityId: resolved.identity.entityStoreId,
                entityType: group.entity_type,
                groupSize: group.group_size,
                target: getBaseEntityData(group.target),
                aliases: group.aliases.map(getBaseEntityData),
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
              data: { message: `Error fetching the resolution group: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};

const getBaseEntityData = (source: Record<string, unknown>): Record<string, unknown> => {
  const identity: Record<string, unknown> = {};
  const entityId = getFieldValue(source, 'entity.id');
  const name = getFieldValue(source, 'entity.name');
  const entityType = getFieldValue(source, 'entity.EngineMetadata.Type');

  if (entityId) {
    identity.entityId = entityId;
  }
  if (name) {
    identity.name = name;
  }
  if (entityType) {
    identity.entityType = entityType;
  }
  return identity;
};
