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
import {
  getSpaceIdFromRequest,
  getRiskFieldPrefix,
  getRiskDataFromEntity,
  type EntityTypeForRisk,
} from './helpers';
import { securityTool } from './constants';
import { RISK_SCORE_INSTRUCTION, RISK_LEVELS_INSTRUCTION } from '../utils/entity_tools_instructions';

const RISK_LEVELS = ['Critical', 'High', 'Moderate', 'Low', 'Unknown'] as const;
const ASSET_CRITICALITY_LEVELS = [
  'extreme_impact',
  'high_impact',
  'medium_impact',
  'low_impact',
] as const;

const entityStoreSearchSchema = z.object({
  entityTypes: z
    .array(z.enum(['host', 'user', 'service', 'generic']))
    .min(1)
    .describe('The types of entities to search for. At least one type is required.'),
  riskLevels: z
    .array(z.enum(RISK_LEVELS))
    .optional()
    .describe(
      'Filter by risk levels. Use "Critical" or "High" to find high-risk entities. If not specified, all risk levels are included.'
    ),
  assetCriticality: z
    .array(z.enum(ASSET_CRITICALITY_LEVELS))
    .optional()
    .describe(
      'Filter by asset criticality levels. Use "extreme_impact" or "high_impact" to find high-impact assets.'
    ),
  attributes: z
    .object({
      privileged: z.boolean().optional().describe('Filter for privileged entities'),
      managed: z.boolean().optional().describe('Filter for managed entities'),
      mfa_enabled: z.boolean().optional().describe('Filter for entities with MFA enabled'),
      asset: z.boolean().optional().describe('Filter for entities marked as assets'),
    })
    .optional()
    .describe('Filter by entity attributes'),
  behaviors: z
    .object({
      brute_force_victim: z
        .boolean()
        .optional()
        .describe('Filter for entities that have been brute force victims'),
      new_country_login: z
        .boolean()
        .optional()
        .describe('Filter for entities with new country logins'),
      used_usb_device: z
        .boolean()
        .optional()
        .describe('Filter for entities that have used USB devices'),
    })
    .optional()
    .describe('Filter by entity behaviors'),
  sortBy: z
    .enum(['risk_score', 'last_activity', 'first_seen', 'name'])
    .optional()
    .describe('Field to sort results by. Defaults to risk_score.'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Sort order. Defaults to desc (highest first).'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of entities to return. Defaults to 10.'),
});

export const SECURITY_ENTITY_STORE_SEARCH_TOOL_ID = securityTool('entity_store_search');

/**
 * Builds an Elasticsearch query from the search parameters
 */
const buildEntityQuery = (
  params: z.infer<typeof entityStoreSearchSchema>
): Record<string, unknown> => {
  const mustClauses: Array<Record<string, unknown>> = [];

  // Filter by risk levels - need to check entity-type-specific fields
  // Risk data is stored under different paths: user.risk, host.risk, service.risk, entity.risk (for generic)
  if (params.riskLevels && params.riskLevels.length > 0) {
    mustClauses.push({
      bool: {
        should: params.entityTypes.map((type) => ({
          terms: {
            [`${getRiskFieldPrefix(type)}.risk.calculated_level`]: params.riskLevels,
          },
        })),
        minimum_should_match: 1,
      },
    });
  }

  // Filter by asset criticality
  if (params.assetCriticality && params.assetCriticality.length > 0) {
    mustClauses.push({
      terms: {
        'asset.criticality': params.assetCriticality,
      },
    });
  }

  // Filter by attributes
  if (params.attributes) {
    if (params.attributes.privileged !== undefined) {
      mustClauses.push({
        term: { 'entity.attributes.Privileged': params.attributes.privileged },
      });
    }
    if (params.attributes.managed !== undefined) {
      mustClauses.push({
        term: { 'entity.attributes.Managed': params.attributes.managed },
      });
    }
    if (params.attributes.mfa_enabled !== undefined) {
      mustClauses.push({
        term: { 'entity.attributes.Mfa_enabled': params.attributes.mfa_enabled },
      });
    }
    if (params.attributes.asset !== undefined) {
      mustClauses.push({
        term: { 'entity.attributes.Asset': params.attributes.asset },
      });
    }
  }

  // Filter by behaviors
  if (params.behaviors) {
    if (params.behaviors.brute_force_victim !== undefined) {
      mustClauses.push({
        term: { 'entity.behaviors.Brute_force_victim': params.behaviors.brute_force_victim },
      });
    }
    if (params.behaviors.new_country_login !== undefined) {
      mustClauses.push({
        term: { 'entity.behaviors.New_country_login': params.behaviors.new_country_login },
      });
    }
    if (params.behaviors.used_usb_device !== undefined) {
      mustClauses.push({
        term: { 'entity.behaviors.Used_usb_device': params.behaviors.used_usb_device },
      });
    }
  }

  if (mustClauses.length === 0) {
    return { match_all: {} };
  }

  return {
    bool: {
      must: mustClauses,
    },
  };
};

/**
 * Maps sortBy parameter to actual Elasticsearch field(s)
 * For risk_score sorting, we need to handle multiple entity-type-specific fields
 */
const getSortFields = (
  sortBy: string | undefined,
  entityTypes: EntityTypeForRisk[]
): Array<Record<string, unknown>> => {
  switch (sortBy) {
    case 'risk_score':
      // For risk score, we need to sort by all possible entity-type-specific risk fields
      // Using a script sort to coalesce the values from different paths
      return [
        {
          _script: {
            type: 'number',
            script: {
              source: `
                double score = 0;
                for (String prefix : params.prefixes) {
                  String field = prefix + '.risk.calculated_score_norm';
                  if (doc.containsKey(field) && doc[field].size() > 0) {
                    score = doc[field].value;
                    break;
                  }
                }
                return score;
              `,
              params: {
                prefixes: entityTypes.map((type) => getRiskFieldPrefix(type)),
              },
            },
          },
        },
      ];
    case 'last_activity':
      return [{ 'entity.lifecycle.Last_activity': { unmapped_type: 'date' } }];
    case 'first_seen':
      return [{ 'entity.lifecycle.First_seen': { unmapped_type: 'date' } }];
    case 'name':
      return [{ 'entity.name': { unmapped_type: 'keyword' } }];
    default:
      // Default to risk_score sorting
      return [
        {
          _script: {
            type: 'number',
            script: {
              source: `
                double score = 0;
                for (String prefix : params.prefixes) {
                  String field = prefix + '.risk.calculated_score_norm';
                  if (doc.containsKey(field) && doc[field].size() > 0) {
                    score = doc[field].value;
                    break;
                  }
                }
                return score;
              `,
              params: {
                prefixes: entityTypes.map((type) => getRiskFieldPrefix(type)),
              },
            },
          },
        },
      ];
  }
};

/**
 * Queries the entity store indices for entities matching the search criteria
 */
const searchEntityStore = async ({
  esClient,
  spaceId,
  entityTypes,
  query,
  sortFields,
  sortOrder,
  limit,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  entityTypes: Array<'host' | 'user' | 'service' | 'generic'>;
  query: Record<string, unknown>;
  sortFields: Array<Record<string, unknown>>;
  sortOrder: 'asc' | 'desc';
  limit: number;
}): Promise<Array<Record<string, unknown>>> => {
  // Build index patterns for all requested entity types
  const indices = entityTypes.map((type) =>
    getEntitiesIndexName(EntityTypeEnum.enum[type], spaceId)
  );

  // Apply sort order to each sort field
  const sortWithOrder = sortFields.map((sortField) => {
    const key = Object.keys(sortField)[0];
    const value = sortField[key];
    if (key === '_script') {
      return {
        _script: {
          ...(value as Record<string, unknown>),
          order: sortOrder,
        },
      };
    }
    return {
      [key]: {
        ...(value as Record<string, unknown>),
        order: sortOrder,
      },
    };
  });

  const response = await esClient.search({
    index: indices,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: limit,
    query,
    sort: sortWithOrder,
  });

  return response.hits.hits
    .map((hit) => hit._source as Record<string, unknown>)
    .filter((source): source is Record<string, unknown> => source !== undefined);
};

export const entityStoreSearchTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof entityStoreSearchSchema> => {
  return {
    id: SECURITY_ENTITY_STORE_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Search the Entity Store for entities (hosts, users, services) matching specific criteria. Use this tool to find entities based on risk levels, asset criticality, attributes (privileged, managed), and behaviors. For example: "What are the riskiest hosts that are high impact?" or "Show me privileged users with high risk scores."

Key fields:
- entity.risk.calculated_level: ${RISK_LEVELS_INSTRUCTION}
- asset.criticality: extreme_impact, high_impact, medium_impact, low_impact
- entity.attributes: Privileged, Managed, Mfa_enabled, Asset
- entity.behaviors: Brute_force_victim, New_country_login, Used_usb_device

${RISK_SCORE_INSTRUCTION}`,
    schema: entityStoreSearchSchema,
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
    handler: async (params, { request, esClient }) => {
      const spaceId = getSpaceIdFromRequest(request);
      const {
        entityTypes,
        riskLevels,
        assetCriticality,
        attributes,
        behaviors,
        sortBy = 'risk_score',
        sortOrder = 'desc',
        limit = 10,
      } = params;

      logger.debug(
        `${SECURITY_ENTITY_STORE_SEARCH_TOOL_ID} tool called with entityTypes: ${entityTypes.join(', ')}, riskLevels: ${riskLevels?.join(', ') ?? 'all'}`
      );

      try {
        const query = buildEntityQuery({
          entityTypes,
          riskLevels,
          assetCriticality,
          attributes,
          behaviors,
        });
        const sortFields = getSortFields(sortBy, entityTypes);

        const entities = await searchEntityStore({
          esClient: esClient.asCurrentUser,
          spaceId,
          entityTypes,
          query,
          sortFields,
          sortOrder,
          limit,
        });

        if (entities.length === 0) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: `No entities found matching the specified criteria`,
                },
              },
            ],
          };
        }

        // Format entities for response, prioritizing key fields
        const formattedEntities = entities.map((entity) => {
          const entityData = entity.entity as Record<string, unknown> | undefined;
          // Determine entity type from the document to extract risk from the correct path
          const detectedEntityType = (entityData?.type as EntityTypeForRisk) ?? 'generic';
          // Risk data is stored under entity-type-specific paths (e.g., user.risk, host.risk)
          const riskData = getRiskDataFromEntity(entity, detectedEntityType);
          const lifecycleData = entityData?.lifecycle as Record<string, unknown> | undefined;
          const attributesData = entityData?.attributes as Record<string, unknown> | undefined;
          const behaviorsData = entityData?.behaviors as Record<string, unknown> | undefined;
          const assetData = entity.asset as Record<string, unknown> | undefined;

          return {
            // Identity
            entity_id: entityData?.id,
            entity_name: entityData?.name,
            entity_type: entityData?.type,
            // Risk (prioritized)
            risk_score_norm: riskData?.calculated_score_norm,
            risk_level: riskData?.calculated_level,
            // Asset criticality
            asset_criticality: assetData?.criticality,
            // Lifecycle
            first_seen: lifecycleData?.First_seen,
            last_activity: lifecycleData?.Last_activity,
            // Attributes (if present)
            ...(attributesData && Object.keys(attributesData).length > 0
              ? { attributes: attributesData }
              : {}),
            // Behaviors (if present)
            ...(behaviorsData && Object.keys(behaviorsData).length > 0
              ? { behaviors: behaviorsData }
              : {}),
            // Include host/user/service specific identity fields
            ...(entity.host ? { host: entity.host } : {}),
            ...(entity.user ? { user: entity.user } : {}),
            ...(entity.service ? { service: entity.service } : {}),
          };
        });

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                total_found: entities.length,
                entities: formattedEntities,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_ENTITY_STORE_SEARCH_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error searching Entity Store: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'entity-store', 'entities', 'search'],
  };
};
