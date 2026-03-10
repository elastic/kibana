/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import {
  FF_ENABLE_ENTITY_STORE_V2,
  getLatestEntityStoreIndexName,
} from '@kbn/entity-store/common';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { securityTool } from './constants';

const DEFAULT_LIMIT = 10;

const SORT_FIELD_MAP: Record<string, string> = {
  risk_score: 'entity.risk.calculated_score_norm',
  name: 'entity.name',
  last_activity: 'entity.lifecycle.last_activity',
  first_seen: 'entity.lifecycle.first_seen',
};

const KEEP_FIELDS = [
  '@timestamp',
  'entity.id',
  'entity.name',
  'entity.EngineMetadata.Type',
  'entity.risk.calculated_score_norm',
  'entity.risk.calculated_level',
  'asset.criticality',
  'entity.source',
  'entity.lifecycle.first_seen',
  'entity.lifecycle.last_activity',
  'entity.attributes.watchlists',
  'entity.attributes.managed',
  'entity.attributes.mfa_enabled',
  'entity.attributes.asset',
  'entity.behaviors.rule_names',
  'entity.behaviors.anomaly_job_ids',
];

const entityStoreSearchSchema = z.object({
  entityTypes: z
    .array(z.enum(['user', 'host', 'service', 'generic']))
    .optional()
    .describe('Entity types to search. If omitted, searches all types.'),
  entityName: z
    .string()
    .optional()
    .describe('Entity name or identifier to search for (exact or partial match via wildcard)'),
  riskLevel: z
    .enum(['Unknown', 'Low', 'Moderate', 'High', 'Critical'])
    .optional()
    .describe('Filter by risk level'),
  riskScoreMin: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Minimum normalized risk score (0-100)'),
  riskScoreMax: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Maximum normalized risk score (0-100)'),
  criticalityLevel: z
    .enum(['low_impact', 'medium_impact', 'high_impact', 'extreme_impact'])
    .optional()
    .describe('Filter by asset criticality level'),
  attributes: z
    .object({
      watchlists: z.array(z.string()).optional(),
      managed: z.boolean().optional(),
      mfa_enabled: z.boolean().optional(),
      asset: z.boolean().optional(),
    })
    .optional()
    .describe('Filter by entity attributes'),
  behaviors: z
    .object({
      ruleNames: z.array(z.string()).optional(),
      anomalyJobIds: z.array(z.string()).optional(),
    })
    .optional()
    .describe('Filter by entity behaviors (rule names or anomaly job IDs)'),
  sortBy: z
    .enum(['risk_score', 'name', 'last_activity', 'first_seen'])
    .optional()
    .describe('Sort field (default: risk_score)'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of results to return (default: 10)'),
});

export type EntityStoreSearchParams = z.infer<typeof entityStoreSearchSchema>;

export const SECURITY_ENTITY_STORE_SEARCH_TOOL_ID = securityTool('entity_store_search');

const escapeEsqlString = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export const buildEntityStoreSearchQuery = (
  params: EntityStoreSearchParams,
  index: string
): string => {
  const {
    entityTypes,
    entityName,
    riskLevel,
    riskScoreMin,
    riskScoreMax,
    criticalityLevel,
    attributes,
    behaviors,
    sortBy = 'risk_score',
    sortOrder = 'desc',
    limit = DEFAULT_LIMIT,
  } = params;

  const whereClauses: string[] = ['entity.id IS NOT NULL'];

  if (entityTypes && entityTypes.length > 0) {
    if (entityTypes.length === 1) {
      whereClauses.push(
        `entity.EngineMetadata.Type == "${escapeEsqlString(entityTypes[0])}"`
      );
    } else {
      const inList = entityTypes
        .map((t) => `"${escapeEsqlString(t)}"`)
        .join(', ');
      whereClauses.push(`entity.EngineMetadata.Type IN (${inList})`);
    }
  }

  if (entityName) {
    const escaped = escapeEsqlString(entityName);
    if (entityName.includes('*')) {
      whereClauses.push(`entity.name LIKE "${escaped}"`);
    } else {
      whereClauses.push(`entity.name == "${escaped}"`);
    }
  }

  if (riskLevel) {
    whereClauses.push(
      `entity.risk.calculated_level == "${escapeEsqlString(riskLevel)}"`
    );
  }

  if (riskScoreMin !== undefined) {
    whereClauses.push(`entity.risk.calculated_score_norm >= ${riskScoreMin}`);
  }

  if (riskScoreMax !== undefined) {
    whereClauses.push(`entity.risk.calculated_score_norm <= ${riskScoreMax}`);
  }

  if (criticalityLevel) {
    whereClauses.push(
      `asset.criticality == "${escapeEsqlString(criticalityLevel)}"`
    );
  }

  if (attributes) {
    if (attributes.watchlists && attributes.watchlists.length > 0) {
      for (const watchlist of attributes.watchlists) {
        whereClauses.push(
          `entity.attributes.watchlists == "${escapeEsqlString(watchlist)}"`
        );
      }
    }
    if (attributes.managed !== undefined) {
      whereClauses.push(`entity.attributes.managed == ${attributes.managed}`);
    }
    if (attributes.mfa_enabled !== undefined) {
      whereClauses.push(
        `entity.attributes.mfa_enabled == ${attributes.mfa_enabled}`
      );
    }
    if (attributes.asset !== undefined) {
      whereClauses.push(`entity.attributes.asset == ${attributes.asset}`);
    }
  }

  if (behaviors) {
    if (behaviors.ruleNames && behaviors.ruleNames.length > 0) {
      for (const ruleName of behaviors.ruleNames) {
        whereClauses.push(
          `entity.behaviors.rule_names == "${escapeEsqlString(ruleName)}"`
        );
      }
    }
    if (behaviors.anomalyJobIds && behaviors.anomalyJobIds.length > 0) {
      for (const jobId of behaviors.anomalyJobIds) {
        whereClauses.push(
          `entity.behaviors.anomaly_job_ids == "${escapeEsqlString(jobId)}"`
        );
      }
    }
  }

  const sortField = SORT_FIELD_MAP[sortBy] ?? SORT_FIELD_MAP.risk_score;

  return [
    `FROM ${index}`,
    `| WHERE ${whereClauses.join(' AND ')}`,
    `| KEEP ${KEEP_FIELDS.join(', ')}`,
    `| SORT ${sortField} ${sortOrder.toUpperCase()}`,
    `| LIMIT ${limit}`,
  ].join('\n');
};

export const entityStoreSearchTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof entityStoreSearchSchema> => {
  return {
    id: SECURITY_ENTITY_STORE_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and filter entities in the Entity Store. Supports searching across users, hosts, services, and generic entities with filters for risk level, risk score range, asset criticality, entity attributes (watchlists, managed, MFA, asset), and behaviors (rule names, anomaly jobs). Use this to answer questions like "What are the riskiest hosts?", "Show me high-criticality users", or "Find entities with anomalous behavior". Always use 'entity.risk.calculated_score_norm' (0-100) when reporting risk scores.`,
    schema: entityStoreSearchSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId, uiSettings }: ToolAvailabilityContext) => {
        try {
          const isV2Enabled = await uiSettings.get<boolean>(FF_ENABLE_ENTITY_STORE_V2);
          if (!isV2Enabled) {
            return {
              status: 'unavailable',
              reason: 'Entity Store v2 is not enabled',
            };
          }

          const availability = await getAgentBuilderResourceAvailability({
            core,
            request,
            logger,
          });
          if (availability.status !== 'available') {
            return availability;
          }

          const [coreStart] = await core.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          const entityStoreIndex = getLatestEntityStoreIndexName(spaceId);

          const indexExists = await esClient.indices.exists({ index: entityStoreIndex });
          if (!indexExists) {
            return {
              status: 'unavailable',
              reason: 'Entity Store index does not exist for this space',
            };
          }

          return { status: 'available' };
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
    handler: async (params, { spaceId, esClient }) => {
      logger.debug(
        `${SECURITY_ENTITY_STORE_SEARCH_TOOL_ID} tool called with params: ${JSON.stringify(params)}`
      );

      try {
        const entityStoreIndex = getLatestEntityStoreIndexName(spaceId);
        const query = buildEntityStoreSearchQuery(params, entityStoreIndex);

        const { columns, values } = await esClient.asCurrentUser.esql.query({
          query,
          drop_null_columns: true,
        });

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.esqlResults,
              data: { query, columns, values },
            },
          ],
        };
      } catch (error) {
        logger.error(
          `Error in ${SECURITY_ENTITY_STORE_SEARCH_TOOL_ID} tool: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error searching Entity Store: ${
                  error instanceof Error ? error.message : 'Unknown error'
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
