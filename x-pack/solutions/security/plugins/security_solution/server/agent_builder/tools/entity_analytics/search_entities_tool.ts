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
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import {
  getHistorySnapshotIndexPattern,
  getEntitiesAlias,
  ENTITY_LATEST,
} from '@kbn/entity-store/server';
import type { Logger } from '@kbn/logging';
import {
  IdentifierType,
  EntityRiskLevels,
} from '../../../../common/api/entity_analytics/common/common.gen';
import type { ExperimentalFeatures } from '../../../../common';
import { AssetCriticalityLevel } from '../../../../common/api/entity_analytics/asset_criticality/common.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../lib/telemetry/event_based/events';
import { securityTool } from '../constants';

const ENTITY_STORE_KEEP_FIELDS = [
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
] as const;

const MINUTES_PER_DAY = 1440;

const intervalToMinutes = (interval: string): number => {
  const match = interval.match(/^(\d+)([smhdwM])$/);
  if (match == null) throw new Error(`Invalid interval format: ${interval}`);
  const [, value, unit] = match;
  const minutesMap: Record<string, number> = {
    s: 1 / 60,
    m: 1,
    h: 60,
    d: 1440,
    w: 10080,
    M: 43200,
  };
  return Number(value) * minutesMap[unit];
};

const schema = z.object({
  entityTypes: z
    .array(IdentifierType)
    .optional()
    .describe('Filter by entity type(s): host, user, service, or generic.'),
  riskScoreChangeInterval: z
    .string()
    .regex(
      /^\d+[smhdwM]$/,
      `Intervals should follow {value}{unit} where unit is one of s,m,h,d,w,M`
    )
    .refine(
      (val) => {
        try {
          return intervalToMinutes(val) >= MINUTES_PER_DAY;
        } catch {
          return false;
        }
      },
      {
        message: 'riskScoreChangeInterval must be at least 1 day (e.g. "1d", "1w", "1M")',
      }
    )
    .describe(
      `The time interval to search for risk score changes (e.g. '30d', '7d', '1w'). Must be at least 1 day. Intervals should be in format {value}{unit} where value is a number and unit is one of 'd' (day), 'w' (week), or 'M' (month)`
    )
    .optional(),
  riskScoreMin: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(
      'Minimum normalized risk score (0-100). Only returns entities with entity.risk.calculated_score_norm >= this value.'
    ),
  riskScoreMax: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(
      'Maximum normalized risk score (0-100). Only returns entities with entity.risk.calculated_score_norm <= this value.'
    ),
  riskLevels: z
    .array(EntityRiskLevels)
    .optional()
    .describe('Filter by risk level(s). Valid values: Unknown, Low, Moderate, High, Critical.'),
  criticalityLevels: z
    .array(AssetCriticalityLevel)
    .optional()
    .describe(
      'Filter by asset criticality level(s). Valid values: low_impact, medium_impact, high_impact, extreme_impact.'
    ),
  watchlists: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Filter for entities that belong to any of the specified watchlists (entity.attributes.watchlists).'
    ),
  managedOnly: z
    .boolean()
    .optional()
    .describe('When true, only returns managed entities (entity.attributes.managed == true).'),
  mfaEnabledOnly: z
    .boolean()
    .optional()
    .describe(
      'When true, only returns entities with MFA enabled (entity.attributes.mfa_enabled == true).'
    ),
  assetOnly: z
    .boolean()
    .optional()
    .describe(
      'When true, only returns entities that are assets (entity.attributes.asset == true).'
    ),
  firstSeenAfter: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
      'Date must be in ISO 8601 format (e.g. "2024-01-15T12:00:00Z")'
    )
    .optional()
    .describe(
      'Filter for entities first seen after a certain date. Date must be in ISO 8601 datetime format.'
    ),
  firstSeenBefore: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
      'Date must be in ISO 8601 format (e.g. "2024-01-15T12:00:00Z")'
    )
    .optional()
    .describe(
      'Filter for entities first seen before a certain date. Date must be in ISO 8601 datetime format.'
    ),
  lastSeenAfter: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
      'Date must be in ISO 8601 format (e.g. "2024-01-15T12:00:00Z")'
    )
    .optional()
    .describe(
      'Filter for entities last seen after a certain date. Date must be in ISO 8601 datetime format.'
    ),
  lastSeenBefore: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
      'Date must be in ISO 8601 format (e.g. "2024-01-15T12:00:00Z")'
    )
    .optional()
    .describe(
      'Filter for entities last seen before a certain date. Date must be in ISO 8601 datetime format.'
    ),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of entities to return (1-100, default 10).'),
});
type ToolParams = z.infer<typeof schema>;

export const SECURITY_SEARCH_ENTITIES_TOOL_ID = securityTool('search_entities');

const escapeEsqlString = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const buildInListClause = (field: string, values: string[]): string => {
  const escaped = values.map((v) => `"${escapeEsqlString(v)}"`).join(', ');
  return `${field} IN (${escaped})`;
};

const buildMvContainsClause = (field: string, values: string[]): string =>
  values.map((v) => `MV_CONTAINS(${field}, "${escapeEsqlString(v)}")`).join(' OR ');

const intervalToEsql = (interval: string) => {
  const match = interval.match(/^(\d+)([smhdwM])$/);
  if (match == null) {
    throw new Error(`Invalid interval format: ${interval}`);
  }

  const [, value, unit] = match;
  const unitMap: Record<string, string> = {
    s: 'second',
    m: 'minute',
    h: 'hour',
    d: 'day',
    w: 'week',
    M: 'month',
  };
  const unitLabel = unitMap[unit];
  if (unitLabel == null) {
    throw new Error(`Unsupported interval unit: ${unit}`);
  }

  const numericValue = Number(value);
  const intervalUnit = numericValue === 1 ? unitLabel : `${unitLabel}s`;
  return `NOW() - ${numericValue} ${intervalUnit}`;
};

const buildIdentityFilterClauses = ({ entityTypes }: ToolParams) => {
  const clauses: string[] = [];
  if (entityTypes && entityTypes.length > 0) {
    clauses.push(`WHERE ${buildInListClause('entity.EngineMetadata.Type', entityTypes)}`);
  }
  return clauses;
};

const buildRiskAndAssetCriticalityFilterClauses = ({
  riskScoreMin,
  riskScoreMax,
  riskLevels,
  riskScoreChangeInterval,
  criticalityLevels,
}: ToolParams) => {
  const clauses: string[] = [];
  if (riskScoreChangeInterval) {
    clauses.push(`WHERE entity.risk.calculated_score_norm IS NOT NULL`);
    clauses.push(
      `WHERE @timestamp >= DATE_TRUNC(1 day, ${intervalToEsql(riskScoreChangeInterval)})`
    );
  }
  if (riskScoreMin != null) {
    clauses.push(`WHERE entity.risk.calculated_score_norm >= ${riskScoreMin}`);
  }
  if (riskScoreMax != null) {
    clauses.push(`WHERE entity.risk.calculated_score_norm <= ${riskScoreMax}`);
  }
  if (riskLevels && riskLevels.length > 0) {
    clauses.push(`WHERE ${buildInListClause('entity.risk.calculated_level', riskLevels)}`);
  }
  if (criticalityLevels && criticalityLevels.length > 0) {
    clauses.push(`WHERE ${buildInListClause('asset.criticality', criticalityLevels)}`);
  }
  return clauses;
};

const buildAttributeFilterClauses = ({
  watchlists,
  managedOnly,
  mfaEnabledOnly,
  assetOnly,
}: ToolParams) => {
  const clauses: string[] = [];
  if (watchlists && watchlists.length > 0) {
    clauses.push(`WHERE ${buildMvContainsClause('entity.attributes.watchlists', watchlists)}`);
  }
  if (managedOnly === true) {
    clauses.push(`WHERE entity.attributes.managed == true`);
  }
  if (mfaEnabledOnly === true) {
    clauses.push(`WHERE entity.attributes.mfa_enabled == true`);
  }
  if (assetOnly === true) {
    clauses.push(`WHERE entity.attributes.asset == true`);
  }
  return clauses;
};

const buildLifecycleFilterClauses = ({
  firstSeenAfter,
  firstSeenBefore,
  lastSeenAfter,
  lastSeenBefore,
}: ToolParams) => {
  const clauses: string[] = [];
  if (firstSeenAfter) {
    clauses.push(`WHERE entity.lifecycle.first_seen >= "${escapeEsqlString(firstSeenAfter)}"`);
  }
  if (firstSeenBefore) {
    clauses.push(`WHERE entity.lifecycle.first_seen <= "${escapeEsqlString(firstSeenBefore)}"`);
  }
  if (lastSeenAfter) {
    clauses.push(`WHERE entity.lifecycle.last_activity >= "${escapeEsqlString(lastSeenAfter)}"`);
  }
  if (lastSeenBefore) {
    clauses.push(`WHERE entity.lifecycle.last_activity <= "${escapeEsqlString(lastSeenBefore)}"`);
  }
  return clauses;
};

const buildStatsClause = ({ riskScoreChangeInterval }: ToolParams): string[] => {
  if (riskScoreChangeInterval) {
    return [
      `STATS earliest_score = FIRST(entity.risk.calculated_score_norm, @timestamp), latest_score = LAST(entity.risk.calculated_score_norm, @timestamp) BY entity.id`,
      `EVAL risk_score_change = latest_score - earliest_score`,
      `EVAL significant_increase = CASE(risk_score_change > 20, true, risk_score_change <= 20, false)`,
    ];
  }
  return [];
};

const buildSortClause = ({ riskScoreChangeInterval }: ToolParams): string[] => {
  if (riskScoreChangeInterval) {
    return [`SORT risk_score_change DESC`];
  }

  // default to sorting by risk score
  return [`SORT entity.risk.calculated_score_norm DESC`];
};

const buildKeepClause = ({ riskScoreChangeInterval }: ToolParams): string[] => {
  if (riskScoreChangeInterval) {
    return [];
  }

  return [`KEEP ${ENTITY_STORE_KEEP_FIELDS.join(', ')}`];
};

const buildFromClause = (
  entityIndex: string,
  entitySnapshotIndex: string,
  { riskScoreChangeInterval }: ToolParams
): string => {
  if (riskScoreChangeInterval) {
    return `FROM ${entityIndex},${entitySnapshotIndex}`;
  }
  return `FROM ${entityIndex}`;
};

const buildQuery = (
  entityIndex: string,
  entitySnapshotIndex: string,
  params: ToolParams
): string => {
  const clauses = [
    buildFromClause(entityIndex, entitySnapshotIndex, params),
    ...buildIdentityFilterClauses(params),
    ...buildAttributeFilterClauses(params),
    ...buildLifecycleFilterClauses(params),
    ...buildRiskAndAssetCriticalityFilterClauses(params),
    ...buildStatsClause(params),
    ...buildSortClause(params),
    ...buildKeepClause(params),
    `LIMIT ${params.maxResults ?? 10}`,
  ];

  return clauses.join('\n| ');
};

export const searchEntitiesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_SEARCH_ENTITIES_TOOL_ID,
    type: ToolType.builtin,
    description: `Search entity store for security entities (host, user, service, generic).
    Supports filtering by normalized risk score, asset criticality, entity attributes, and lifecycle timestamps.
    Use this tool to find entities matching specific criteria.
    Do NOT use if entity ID (EUID) is known; use the "security.get_entity" tool instead.`,
    tags: ['security', 'entity-store', 'entity-analytics'],
    schema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) => {
        try {
          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status === 'available') {
            const isEntityStoreV2Enabled = experimentalFeatures.entityAnalyticsEntityStoreV2;
            if (!isEntityStoreV2Enabled) {
              return {
                status: 'unavailable',
                reason: 'Entity Store V2 is not enabled.',
              };
            }

            const [coreStart] = await core.getStartServices();
            const esClient = coreStart.elasticsearch.client.asInternalUser;

            const indexExists = await esClient.indices.exists({
              index: getEntitiesAlias(ENTITY_LATEST, spaceId),
            });

            if (!indexExists) {
              return {
                status: 'unavailable',
                reason: 'Entity Store V2 index does not exist for this space',
              };
            }
          }

          return availability;
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check entity store v2 index availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async (params, { spaceId, esClient }) => {
      logger.debug(
        `${SECURITY_SEARCH_ENTITIES_TOOL_ID} tool called with parameters ${JSON.stringify(params)}`
      );

      let success = false;
      let entitiesReturned = 0;
      let errorMessage: string | undefined;

      try {
        const client = esClient.asCurrentUser;
        const entityIndex = getEntitiesAlias(ENTITY_LATEST, spaceId);
        const entitySnapshotIndex = getHistorySnapshotIndexPattern(spaceId);
        const query = buildQuery(entityIndex, entitySnapshotIndex, params);

        const { columns, values } = await executeEsql({ query, esClient: client });

        if (values.length === 0) {
          success = true;
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: 'No entities found matching the specified criteria.',
                },
              },
            ],
          };
        }

        success = true;
        entitiesReturned = values.length;
        return {
          results: values.map((_, rowIdx) => ({
            tool_result_id: getToolResultId(),
            type: ToolResultType.esqlResults as const,
            data: { query, columns, values: [values[rowIdx]] },
          })),
        };
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error searching entities in Entity Store: ${errorMessage}` },
            },
          ],
        };
      } finally {
        const [coreStart] = await core.getStartServices();
        coreStart.analytics.reportEvent(ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType, {
          toolId: SECURITY_SEARCH_ENTITIES_TOOL_ID,
          entityTypes: params.entityTypes ?? [],
          spaceId,
          success,
          entitiesReturned,
          errorMessage,
        });
      }
    },
  };
};
