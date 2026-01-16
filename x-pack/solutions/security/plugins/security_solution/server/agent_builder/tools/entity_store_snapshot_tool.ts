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
import {
  getEntitiesIndexName,
  getEntitiesSnapshotIndexName,
  getEntitiesSnapshotIndexPattern,
} from '../../lib/entity_analytics/entity_store/utils';
import { EntityType as EntityTypeEnum } from '../../../common/api/entity_analytics/entity_store/common.gen';
import { getSpaceIdFromRequest } from './helpers';
import { securityTool } from './constants';
import { RISK_SCORE_INSTRUCTION } from '../utils/entity_tools_instructions';

const entityStoreSnapshotSchema = z.object({
  entityType: z
    .enum(['host', 'user', 'service', 'generic'])
    .describe('The type of entity to get historical snapshot for.'),
  identifier: z
    .string()
    .min(1)
    .describe(
      'The identifier value for the entity. For hosts, this is the hostname. For users, this is the username. For services, this is the service name.'
    ),
  snapshotDate: z
    .string()
    .describe(
      'The date to retrieve the historical snapshot for, in ISO 8601 format (YYYY-MM-DD). Example: "2024-03-15"'
    ),
  compareWithCurrent: z
    .boolean()
    .optional()
    .describe(
      'If true, also returns the current entity profile for comparison with the historical snapshot. Defaults to true.'
    ),
});

export const SECURITY_ENTITY_STORE_SNAPSHOT_TOOL_ID = securityTool('entity_store_snapshot');

/**
 * Parses a date string and returns a Date object for the snapshot
 */
const parseSnapshotDate = (dateStr: string): Date => {
  // Handle various date formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Please use ISO 8601 format (YYYY-MM-DD).`);
  }
  // Set to start of day UTC
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

/**
 * Gets a single entity from a specific snapshot index
 */
const getEntityFromSnapshot = async ({
  esClient,
  spaceId,
  entityType,
  identifier,
  snapshotDate,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  entityType: 'host' | 'user' | 'service' | 'generic';
  identifier: string;
  snapshotDate: Date;
}): Promise<Record<string, unknown> | null> => {
  const snapshotIndex = getEntitiesSnapshotIndexName(
    EntityTypeEnum.enum[entityType],
    snapshotDate,
    spaceId
  );

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

  try {
    const response = await esClient.search({
      index: snapshotIndex,
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
  } catch (error) {
    // If the snapshot index doesn't exist, return null
    if (error.meta?.statusCode === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Gets the current entity from the latest index
 */
const getCurrentEntity = async ({
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
 * Lists available snapshot dates for an entity type
 */
const getAvailableSnapshots = async ({
  esClient,
  spaceId,
  entityType,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  entityType: 'host' | 'user' | 'service' | 'generic';
}): Promise<string[]> => {
  const snapshotPattern = getEntitiesSnapshotIndexPattern(EntityTypeEnum.enum[entityType], spaceId);

  try {
    const response = await esClient.cat.indices({
      index: snapshotPattern,
      format: 'json',
      h: 'index',
    });

    // Extract dates from index names
    // Index name format: .entities.v1.history.<date>.<definition_id>
    const dates = response
      .map((idx) => {
        const indexName = (idx as { index?: string }).index ?? '';
        const match = indexName.match(/\.(\d{4}-\d{2}-\d{2})\./);
        return match ? match[1] : null;
      })
      .filter((date): date is string => date !== null)
      .sort()
      .reverse();

    return [...new Set(dates)]; // Remove duplicates
  } catch {
    return [];
  }
};

/**
 * Formats an entity for response
 */
const formatEntityProfile = (entity: Record<string, unknown>) => {
  const entityData = entity.entity as Record<string, unknown> | undefined;
  const riskData = entityData?.risk as Record<string, unknown> | undefined;
  const lifecycleData = entityData?.lifecycle as Record<string, unknown> | undefined;
  const attributesData = entityData?.attributes as Record<string, unknown> | undefined;
  const behaviorsData = entityData?.behaviors as Record<string, unknown> | undefined;
  const assetData = entity.asset as Record<string, unknown> | undefined;

  return {
    entity_id: entityData?.id,
    entity_name: entityData?.name,
    entity_type: entityData?.type,
    risk: riskData
      ? {
          level: riskData.calculated_level,
          score_norm: riskData.calculated_score_norm,
          score: riskData.calculated_score,
        }
      : null,
    asset_criticality: assetData?.criticality ?? null,
    lifecycle: lifecycleData
      ? {
          first_seen: lifecycleData.First_seen,
          last_activity: lifecycleData.Last_activity,
        }
      : null,
    attributes: attributesData ?? {},
    behaviors: behaviorsData ?? {},
    host: entity.host ?? undefined,
    user: entity.user ?? undefined,
    service: entity.service ?? undefined,
    timestamp: entity['@timestamp'],
  };
};

/**
 * Compares two entity profiles and returns the differences
 */
const compareProfiles = (
  historical: ReturnType<typeof formatEntityProfile>,
  current: ReturnType<typeof formatEntityProfile>
) => {
  const changes: Array<{ field: string; from: unknown; to: unknown }> = [];

  // Compare risk
  if (historical.risk?.level !== current.risk?.level) {
    changes.push({
      field: 'risk_level',
      from: historical.risk?.level ?? 'N/A',
      to: current.risk?.level ?? 'N/A',
    });
  }
  if (historical.risk?.score_norm !== current.risk?.score_norm) {
    changes.push({
      field: 'risk_score_norm',
      from: historical.risk?.score_norm ?? 'N/A',
      to: current.risk?.score_norm ?? 'N/A',
    });
  }

  // Compare asset criticality
  if (historical.asset_criticality !== current.asset_criticality) {
    changes.push({
      field: 'asset_criticality',
      from: historical.asset_criticality ?? 'N/A',
      to: current.asset_criticality ?? 'N/A',
    });
  }

  // Compare attributes
  const allAttrKeys = new Set([
    ...Object.keys(historical.attributes),
    ...Object.keys(current.attributes),
  ]);
  for (const key of allAttrKeys) {
    const historicalAttr = historical.attributes as Record<string, unknown>;
    const currentAttr = current.attributes as Record<string, unknown>;
    if (historicalAttr[key] !== currentAttr[key]) {
      changes.push({
        field: `attributes.${key}`,
        from: historicalAttr[key] ?? 'N/A',
        to: currentAttr[key] ?? 'N/A',
      });
    }
  }

  // Compare behaviors
  const allBehaviorKeys = new Set([
    ...Object.keys(historical.behaviors),
    ...Object.keys(current.behaviors),
  ]);
  for (const key of allBehaviorKeys) {
    const historicalBehavior = historical.behaviors as Record<string, unknown>;
    const currentBehavior = current.behaviors as Record<string, unknown>;
    if (historicalBehavior[key] !== currentBehavior[key]) {
      changes.push({
        field: `behaviors.${key}`,
        from: historicalBehavior[key] ?? false,
        to: currentBehavior[key] ?? false,
      });
    }
  }

  return changes;
};

export const entityStoreSnapshotTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof entityStoreSnapshotSchema> => {
  return {
    id: SECURITY_ENTITY_STORE_SNAPSHOT_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieve a historical snapshot of an entity's profile from a specific date. Use this tool to answer questions about what an entity looked like in the past, such as "What did this user's profile look like on March 15th?"

This tool queries the Entity Store's daily snapshots to retrieve historical entity data. Snapshots are created daily at midnight UTC.

Features:
- Retrieve entity profile from a specific historical date
- Optionally compare historical profile with current profile to see changes
- Shows risk score changes, attribute changes, behavior changes over time

${RISK_SCORE_INSTRUCTION}

Note: Historical snapshots are only available if the Entity Store snapshot task has been running. Snapshots older than the retention period may not be available.`,
    schema: entityStoreSnapshotSchema,
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
    handler: async (
      { entityType, identifier, snapshotDate, compareWithCurrent = true },
      { request, esClient }
    ) => {
      const spaceId = getSpaceIdFromRequest(request);

      logger.debug(
        `${SECURITY_ENTITY_STORE_SNAPSHOT_TOOL_ID} tool called with entityType: ${entityType}, identifier: ${identifier}, snapshotDate: ${snapshotDate}`
      );

      try {
        // Parse the snapshot date
        let parsedDate: Date;
        try {
          parsedDate = parseSnapshotDate(snapshotDate);
        } catch (dateError) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message:
                    dateError instanceof Error
                      ? dateError.message
                      : 'Invalid date format. Please use YYYY-MM-DD.',
                },
              },
            ],
          };
        }

        // Get the historical snapshot
        const historicalEntity = await getEntityFromSnapshot({
          esClient: esClient.asCurrentUser,
          spaceId,
          entityType,
          identifier,
          snapshotDate: parsedDate,
        });

        // Get available snapshots for context
        const availableSnapshots = await getAvailableSnapshots({
          esClient: esClient.asCurrentUser,
          spaceId,
          entityType,
        });

        if (!historicalEntity) {
          const message =
            availableSnapshots.length > 0
              ? `No snapshot found for ${entityType} "${identifier}" on ${snapshotDate}. Available snapshot dates: ${availableSnapshots.slice(0, 10).join(', ')}${availableSnapshots.length > 10 ? '...' : ''}`
              : `No snapshot found for ${entityType} "${identifier}" on ${snapshotDate}. No historical snapshots are available for this entity type. Snapshots are created daily by the Entity Store snapshot task.`;

          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message,
                  available_snapshots: availableSnapshots.slice(0, 10),
                },
              },
            ],
          };
        }

        const historicalProfile = formatEntityProfile(historicalEntity);

        // Build response
        const response: Record<string, unknown> = {
          snapshot_date: snapshotDate,
          entity_type: entityType,
          identifier,
          historical_profile: historicalProfile,
        };

        // If comparison requested, get current profile and compare
        if (compareWithCurrent) {
          const currentEntity = await getCurrentEntity({
            esClient: esClient.asCurrentUser,
            spaceId,
            entityType,
            identifier,
          });

          if (currentEntity) {
            const currentProfile = formatEntityProfile(currentEntity);
            response.current_profile = currentProfile;
            response.changes = compareProfiles(historicalProfile, currentProfile);
            response.has_changed = (response.changes as unknown[]).length > 0;
          } else {
            response.current_profile = null;
            response.note =
              'Entity no longer exists in the current Entity Store (may have been deleted or renamed)';
          }
        }

        // Add available snapshots info
        response.available_snapshot_dates = availableSnapshots.slice(0, 10);

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: response,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_ENTITY_STORE_SNAPSHOT_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error retrieving entity snapshot: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'entity-store', 'entities', 'snapshot', 'history'],
  };
};
