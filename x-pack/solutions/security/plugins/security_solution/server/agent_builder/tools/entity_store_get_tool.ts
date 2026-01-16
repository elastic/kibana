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

const entityStoreGetSchema = z.object({
  entityType: z
    .enum(['host', 'user', 'service', 'generic'])
    .describe('The type of entity to retrieve.'),
  identifier: z
    .string()
    .min(1)
    .describe(
      'The identifier value for the entity. For hosts, this is the hostname. For users, this is the username. For services, this is the service name.'
    ),
});

export const SECURITY_ENTITY_STORE_GET_TOOL_ID = securityTool('entity_store_get');

/**
 * Gets a single entity from the entity store by its identifier
 */
const getEntity = async ({
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

export const entityStoreGetTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof entityStoreGetSchema> => {
  return {
    id: SECURITY_ENTITY_STORE_GET_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieve detailed information about a specific entity from the Entity Store. Use this tool when you need comprehensive profile data about a known entity (host, user, or service).

Returns all available information including:
- Entity identity (name, ID, type)
- Risk score and level
- Asset criticality
- Lifecycle data (first seen, last activity)
- Attributes (privileged, managed, MFA enabled)
- Behaviors (brute force victim, new country login, USB device usage)
- Relationships (what the entity communicates with, depends on, etc.)

${RISK_SCORE_INSTRUCTION}

Use this tool for questions like "What do we know about user jsmith?" or "Show me the profile for host server-01".`,
    schema: entityStoreGetSchema,
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
        `${SECURITY_ENTITY_STORE_GET_TOOL_ID} tool called with entityType: ${entityType}, identifier: ${identifier}`
      );

      try {
        const entity = await getEntity({
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

        // Format the entity response with all available data
        const entityData = entity.entity as Record<string, unknown> | undefined;
        const riskData = entityData?.risk as Record<string, unknown> | undefined;
        const lifecycleData = entityData?.lifecycle as Record<string, unknown> | undefined;
        const attributesData = entityData?.attributes as Record<string, unknown> | undefined;
        const behaviorsData = entityData?.behaviors as Record<string, unknown> | undefined;
        const relationshipsData = entityData?.relationships as Record<string, unknown> | undefined;
        const assetData = entity.asset as Record<string, unknown> | undefined;

        const formattedEntity = {
          // Identity
          entity_id: entityData?.id,
          entity_name: entityData?.name,
          entity_type: entityData?.type,
          entity_sub_type: entityData?.sub_type,
          entity_source: entityData?.source,

          // Risk information (prioritized)
          risk: riskData
            ? {
                calculated_score_norm: riskData.calculated_score_norm,
                calculated_level: riskData.calculated_level,
                calculated_score: riskData.calculated_score,
              }
            : null,

          // Asset criticality
          asset_criticality: assetData?.criticality ?? null,

          // Lifecycle information
          lifecycle: lifecycleData
            ? {
                first_seen: lifecycleData.First_seen,
                last_activity: lifecycleData.Last_activity,
              }
            : null,

          // Attributes
          attributes: attributesData ?? {},

          // Behaviors
          behaviors: behaviorsData ?? {},

          // Relationships
          relationships: relationshipsData ?? {},

          // Type-specific identity fields
          ...(entity.host ? { host: entity.host } : {}),
          ...(entity.user ? { user: entity.user } : {}),
          ...(entity.service ? { service: entity.service } : {}),

          // Additional asset information if available
          ...(assetData && Object.keys(assetData).length > 1
            ? {
                asset: {
                  id: assetData.id,
                  name: assetData.name,
                  owner: assetData.owner,
                  environment: assetData.environment,
                  business_unit: assetData.business_unit,
                },
              }
            : {}),

          // Timestamp
          '@timestamp': entity['@timestamp'],
        };

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                entity: formattedEntity,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_ENTITY_STORE_GET_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error retrieving entity: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'entity-store', 'entities', 'profile'],
  };
};
