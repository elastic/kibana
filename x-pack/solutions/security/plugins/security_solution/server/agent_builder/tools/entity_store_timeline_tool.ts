/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getEntitiesIndexName } from '../../lib/entity_analytics/entity_store/utils';
import { EntityType as EntityTypeEnum } from '../../../common/api/entity_analytics/entity_store/common.gen';
import { getSpaceIdFromRequest } from './helpers';
import { securityTool } from './constants';
import { RISK_SCORE_INSTRUCTION } from '../utils/entity_tools_instructions';

const entityStoreTimelineSchema = z.object({
  entityType: z
    .enum(['host', 'user', 'service', 'generic'])
    .describe('The type of entity to get timeline information for.'),
  identifier: z
    .string()
    .min(1)
    .describe(
      'The identifier value for the entity. For hosts, this is the hostname. For users, this is the username. For services, this is the service name.'
    ),
});

export const SECURITY_ENTITY_STORE_TIMELINE_TOOL_ID = securityTool('entity_store_timeline');

/**
 * Gets timeline and activity information for an entity
 */
const getEntityTimeline = async ({
  esClient,
  spaceId,
  entityType,
  identifier,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  entityType: 'host' | 'user' | 'service' | 'generic';
  identifier: string;
}): Promise<Record<string, unknown> | null> => {
  const index = getEntitiesIndexName(EntityTypeEnum.enum[entityType], spaceId);

  // Determine the identity field based on entity type
  let identityField: string;
  switch (entityType) {
    case 'host':
      identityField = 'host.name';
      break;
    case 'user':
      identityField = 'user.name';
      break;
    case 'service':
      identityField = 'service.name';
      break;
    case 'generic':
      identityField = 'entity.id';
      break;
  }

  const response = await esClient.search({
    index,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 1,
    query: {
      term: {
        [identityField]: identifier,
      },
    },
  });

  if (response.hits.hits.length === 0) {
    return null;
  }

  return response.hits.hits[0]._source as Record<string, unknown>;
};

/**
 * Calculates the duration between two dates in a human-readable format
 */
const calculateDuration = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours > 1 ? 's' : ''}`;
};

export const entityStoreTimelineTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof entityStoreTimelineSchema> => {
  return {
    id: SECURITY_ENTITY_STORE_TIMELINE_TOOL_ID,
    type: ToolType.builtin,
    description: `Get activity timeline and lifecycle information for a specific entity. Use this tool to understand an entity's activity history, including when it was first seen, when it was last active, and its behavioral history.

This tool answers questions like:
- "Show me the access timeline for this account"
- "When was this user first seen?"
- "What is the activity history for this host?"
- "How long has this entity been active?"

Returns:
- Lifecycle data: first_seen, last_activity, duration of activity
- Behavioral timeline: history of behaviors (brute force attempts, new country logins, USB device usage)
- Relationships: entities this entity interacts with (communicates_with, depends_on, accesses_frequently, etc.)
- Current risk status with normalized score

${RISK_SCORE_INSTRUCTION}`,
    schema: entityStoreTimelineSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) => {
        try {
          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status === 'available') {
            const [coreStart] = await core.getStartServices();
            const esClient = coreStart.elasticsearch.client.asInternalUser;

            // Check if at least one entity store index exists
            const entityTypes = ['host', 'user', 'service', 'generic'] as const;
            const indices = entityTypes.map((type) =>
              getEntitiesIndexName(EntityTypeEnum.enum[type], spaceId)
            );

            const indexExists = await esClient.indices.exists({
              index: indices,
              allow_no_indices: true,
            });

            if (indexExists) {
              return { status: 'available' };
            }

            return {
              status: 'unavailable',
              reason: 'Entity Store indices do not exist for this space',
            };
          }
          return availability;
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check Entity Store availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async ({ entityType, identifier }, { request, esClient }) => {
      const spaceId = getSpaceIdFromRequest(request);

      logger.debug(
        `${SECURITY_ENTITY_STORE_TIMELINE_TOOL_ID} tool called with entityType: ${entityType}, identifier: ${identifier}`
      );

      try {
        const entity = await getEntityTimeline({
          esClient: esClient.asCurrentUser,
          spaceId,
          entityType,
          identifier,
        });

        if (!entity) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: `No ${entityType} entity found with identifier: ${identifier}`,
                },
              },
            ],
          };
        }

        // Extract timeline-relevant data
        const entityData = entity.entity as Record<string, unknown> | undefined;
        const lifecycleData = entityData?.lifecycle as Record<string, unknown> | undefined;
        const behaviorsData = entityData?.behaviors as Record<string, unknown> | undefined;
        const relationshipsData = entityData?.relationships as Record<string, unknown> | undefined;
        const riskData = entityData?.risk as Record<string, unknown> | undefined;

        const firstSeen = lifecycleData?.First_seen as string | undefined;
        const lastActivity = lifecycleData?.Last_activity as string | undefined;

        // Build the timeline response
        const timelineResponse = {
          // Entity identity
          entity_id: entityData?.id,
          entity_name: entityData?.name,
          entity_type: entityData?.type,

          // Lifecycle timeline
          lifecycle: {
            first_seen: firstSeen ?? null,
            last_activity: lastActivity ?? null,
            activity_duration:
              firstSeen && lastActivity ? calculateDuration(firstSeen, lastActivity) : null,
            days_since_first_seen: firstSeen
              ? Math.floor(
                  (Date.now() - new Date(firstSeen).getTime()) / (1000 * 60 * 60 * 24)
                )
              : null,
            days_since_last_activity: lastActivity
              ? Math.floor(
                  (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
                )
              : null,
          },

          // Current risk status
          current_risk: riskData
            ? {
                level: riskData.calculated_level,
                score_norm: riskData.calculated_score_norm,
              }
            : null,

          // Behavioral history
          behaviors: behaviorsData
            ? {
                brute_force_victim: behaviorsData.Brute_force_victim ?? false,
                new_country_login: behaviorsData.New_country_login ?? false,
                used_usb_device: behaviorsData.Used_usb_device ?? false,
                // List active behaviors
                active_behaviors: Object.entries(behaviorsData)
                  .filter(([, value]) => value === true)
                  .map(([key]) => key.replace(/_/g, ' ').toLowerCase()),
              }
            : { active_behaviors: [] },

          // Relationships - who/what the entity interacts with
          relationships: relationshipsData
            ? {
                communicates_with: relationshipsData.Communicates_with ?? [],
                depends_on: relationshipsData.Depends_on ?? [],
                dependent_of: relationshipsData.Dependent_of ?? [],
                owned_by: relationshipsData.Owned_by ?? [],
                owns: relationshipsData.Owns ?? [],
                accesses_frequently: relationshipsData.Accesses_frequently ?? [],
                accessed_frequently_by: relationshipsData.Accessed_frequently_by ?? [],
                supervises: relationshipsData.Supervises ?? [],
                supervised_by: relationshipsData.Supervised_by ?? [],
              }
            : {},

          // Type-specific identity
          ...(entity.host ? { host_details: entity.host } : {}),
          ...(entity.user ? { user_details: entity.user } : {}),
          ...(entity.service ? { service_details: entity.service } : {}),

          // Last updated
          last_updated: entity['@timestamp'],
        };

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                timeline: timelineResponse,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_ENTITY_STORE_TIMELINE_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error retrieving entity timeline: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'entity-store', 'entities', 'timeline', 'activity'],
  };
};
