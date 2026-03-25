/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { securityTool } from './constants';

const entityStoreQuerySchema = z.object({
  entity_type: z.enum(['host', 'user', 'service']).describe('The type of entity to query'),
  identifier: z
    .string()
    .min(1)
    .max(255)
    .describe(
      'The entity identifier value (hostname, username, service name). Use "*" for top entities.'
    ),
  fields: z
    .array(z.string())
    .max(20)
    .optional()
    .describe('Specific fields to return. If not provided, returns all available fields.'),
  time_range: z
    .string()
    .optional()
    .describe('Time range for entity data (e.g., "7d", "30d"). Defaults to latest snapshot.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum number of entities to return for wildcard queries (default: 10)'),
});

export const SECURITY_ENTITY_STORE_QUERY_TOOL_ID = securityTool('entity_store_query');

/**
 * Builds the entity store index name for a given entity type and space.
 * Entity store indices follow the pattern: .entities.v1.latest.security_<entity_type>_<space>
 */
const getEntityStoreIndexName = (entityType: string, spaceId: string): string => {
  return `.entities.v1.latest.security_${entityType}_${spaceId}`;
};

/**
 * Resolves the entity name field based on entity type.
 */
const getEntityNameField = (entityType: string): string => {
  return `${entityType}.name`;
};

/**
 * Queries the entity store for wildcard queries, returning top entities sorted by risk score.
 */
const queryEntityStoreForWildcard = async ({
  esClient,
  index,
  entityType,
  limit = 10,
  fields,
  timeRange,
}: {
  esClient: ElasticsearchClient;
  index: string;
  entityType: string;
  limit: number;
  fields?: string[];
  timeRange?: string;
}): Promise<Array<Record<string, unknown>>> => {
  const query = timeRange
    ? { bool: { filter: [{ range: { '@timestamp': { gte: `now-${timeRange}` } } }] } }
    : { match_all: {} };

  const response = await esClient.search<Record<string, unknown>>({
    index,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: limit,
    _source: fields ?? true,
    query,
    sort: [
      {
        'entity.risk.calculated_score_norm': {
          order: 'desc',
          missing: '_last',
        },
      },
    ],
  });

  return response.hits.hits
    .map((hit) => hit._source)
    .filter((source): source is Record<string, unknown> => source !== undefined);
};

/**
 * Queries the entity store for a specific entity by name.
 */
const queryEntityStoreByName = async ({
  esClient,
  index,
  entityType,
  identifier,
  fields,
  timeRange,
}: {
  esClient: ElasticsearchClient;
  index: string;
  entityType: string;
  identifier: string;
  fields?: string[];
  timeRange?: string;
}): Promise<Array<Record<string, unknown>>> => {
  const nameField = getEntityNameField(entityType);

  const filterClauses: Array<Record<string, unknown>> = [
    {
      bool: {
        should: [{ term: { 'entity.name': identifier } }, { term: { [nameField]: identifier } }],
        minimum_should_match: 1,
      },
    },
  ];

  if (timeRange) {
    filterClauses.push({ range: { '@timestamp': { gte: `now-${timeRange}` } } });
  }

  const response = await esClient.search<Record<string, unknown>>({
    index,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 10,
    _source: fields ?? true,
    query: {
      bool: {
        filter: filterClauses,
      },
    },
  });

  return response.hits.hits
    .map((hit) => hit._source)
    .filter((source): source is Record<string, unknown> => source !== undefined);
};

export const entityStoreQueryTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof entityStoreQuerySchema> => {
  return {
    id: SECURITY_ENTITY_STORE_QUERY_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Query the unified Entity Store for enriched entity profiles including observed data sources, related alerts, risk context, asset criticality, and entity relationships. Provides richer context than risk scores alone.',
    schema: entityStoreQuerySchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId, uiSettings }: ToolAvailabilityContext) => {
        try {
          if ((await uiSettings.get(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID)) === true) {
            return {
              status: 'unavailable',
              reason:
                'Skills are enabled, which takes precedence over entity store query tool availability',
            };
          }

          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status === 'available') {
            const [coreStart] = await core.getStartServices();
            const esClient = coreStart.elasticsearch.client.asInternalUser;

            // Check if at least one entity store index exists for this space
            const indexExists = await esClient.indices.exists({
              index: getEntityStoreIndexName('*', spaceId),
            });

            if (indexExists) {
              return { status: 'available' };
            }

            return {
              status: 'unavailable',
              reason: 'Entity store indices do not exist for this space',
            };
          }
          return availability;
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check entity store index availability: ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }
      },
    },
    handler: async (
      { entity_type: entityType, identifier, fields, time_range: timeRange, limit = 10 },
      { spaceId, esClient }
    ) => {
      const entityStoreIndex = getEntityStoreIndexName(entityType, spaceId);

      logger.debug(
        `${SECURITY_ENTITY_STORE_QUERY_TOOL_ID} tool called with entity_type: ${entityType}, identifier: ${identifier}`
      );

      try {
        let entities: Array<Record<string, unknown>>;

        if (identifier === '*') {
          entities = await queryEntityStoreForWildcard({
            esClient: esClient.asCurrentUser,
            index: entityStoreIndex,
            entityType,
            limit,
            fields,
            timeRange,
          });

          if (entities.length === 0) {
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.error,
                  data: {
                    message: `No entities found in the ${entityType} entity store`,
                  },
                },
              ],
            };
          }

          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  entity_type: entityType,
                  count: entities.length,
                  entities,
                },
              },
            ],
          };
        }

        // Handle specific entity queries
        entities = await queryEntityStoreByName({
          esClient: esClient.asCurrentUser,
          index: entityStoreIndex,
          entityType,
          identifier,
          fields,
          timeRange,
        });

        if (entities.length === 0) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: `No entity found for ${entityType} with identifier: ${identifier}`,
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                entity_type: entityType,
                identifier,
                count: entities.length,
                entities,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(
          `Error in ${SECURITY_ENTITY_STORE_QUERY_TOOL_ID} tool: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error querying entity store: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'entity-store', 'entities'],
  };
};
