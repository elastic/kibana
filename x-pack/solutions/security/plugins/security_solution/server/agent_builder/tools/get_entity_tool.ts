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
  getLatestEntitiesIndexName,
} from '@kbn/entity-store/server';
import type { Logger } from '@kbn/logging';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/common';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IdentifierType } from '../../../common/api/entity_analytics/common/common.gen';
import { DEFAULT_ALERTS_INDEX, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import { getRiskScoreTimeSeriesIndex } from '../../../common/entity_analytics/risk_engine/indices';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';

const ENTITY_STORE_RISK_SCORE_NORMALIZED_FIELD = 'entity.risk.calculated_score_norm';
const ENTITY_STORE_ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
const ENTITY_STORE_ENTITY_ID_FIELD = 'entity.id';

const schema = z.object({
  entityType: IdentifierType.describe(
    'The type of entity: host, user, service, or generic'
  ).optional(),
  entityId: z
    .string()
    .min(1)
    .describe(
      'The entity id (EUID) to fetch. Supports both prefixed and non-prefixed forms (for example "host:server1" and "server1").'
    ),
  interval: z
    .string()
    .regex(
      /^\d+[smhdwM]$/,
      `Intervals should follow {value}{unit} where unit is one of s,m,h,d,w,M`
    )
    .describe(
      `The time interval to get entity profile snapshot history (e.g. '30d', '24h', '1w'). Intervals should be in format {value}{unit} where value is a number and unit is one of 's' (second), 'm' (minute), 'h' (hour), 'd' (day), 'w' (week), or 'M' (month)`
    )
    .optional(),
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
      'Date must be in ISO 8601 format (e.g. "2024-01-15T12:00:00Z")'
    )
    .describe(
      `Get the entity's profile on a certain date. Date must be in ISO 8601 datetime format. When specified, both the current profile and the profile snapshot will be fetched.`
    )
    .optional(),
});

export const SECURITY_GET_ENTITY_TOOL_ID = securityTool('get_entity');

const escapeEsqlString = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const escapeEsqlRlikePattern = (value: string) => {
  const regexEscaped = value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
  return escapeEsqlString(regexEscaped);
};

export const normalizeEntityId = (
  entityId: string,
  entityType?: z.infer<typeof IdentifierType>
): string => {
  if (!entityType) {
    return entityId;
  }

  const prefix = `${entityType}:`;
  return entityId.startsWith(prefix) ? entityId : `${prefix}${entityId}`;
};

const getColumnValue = (
  columns: Array<{ name: string }>,
  values: unknown[][],
  columnName: string
): unknown => {
  const idx = columns.findIndex((col) => col.name === columnName);
  return idx >= 0 ? values[0][idx] : undefined;
};
interface GetAlertIdsFromRiskScoreIndexParams {
  entityId: string;
  entityType: string;
  esClient: ElasticsearchClient;
  spaceId: string;
}

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

const dateToUtcDayRange = (isoDate: string): { start: string; end: string } => {
  const day = isoDate.slice(0, 10); // "YYYY-MM-DD"
  return {
    start: `${day}T00:00:00.000Z`,
    end: `${day}T23:59:59.999Z`,
  };
};

/**
 * Queries the risk score index via ES|QL and returns the alert IDs
 * from the entity's risk score inputs. The inputs.id sub-field is returned
 * as a multi-value column when the entity has multiple contributing alerts.
 */
const getAlertIdsFromRiskScoreIndex = async ({
  esClient,
  spaceId,
  entityId,
  entityType,
}: GetAlertIdsFromRiskScoreIndexParams): Promise<string[]> => {
  const riskIndex = getRiskScoreTimeSeriesIndex(spaceId);
  const escapedEntityId = escapeEsqlString(entityId);
  const idValueField = `${entityType}.name`;
  const inputsIdField = `${entityType}.risk.inputs.id`;
  const query = `FROM ${riskIndex} | WHERE ${idValueField} == "${escapedEntityId}" | KEEP ${inputsIdField} | LIMIT 1`;

  const { columns, values } = await executeEsql({ query, esClient });
  if (values.length === 0) {
    return [];
  }

  const colIdx = columns.findIndex((col) => col.name === inputsIdField);
  if (colIdx < 0) {
    return [];
  }

  const alertIds = values[0][colIdx];
  if (!alertIds) {
    return [];
  }

  const ids = Array.isArray(alertIds) ? alertIds : [alertIds];
  return ids.filter((id): id is string => typeof id === 'string');
};

interface FindEntityByIdParams {
  entityIndex: string;
  entityId: string;
  entityType?: z.infer<typeof IdentifierType>;
  esClient: ElasticsearchClient;
}

const findEntityById = async ({
  entityIndex,
  entityId,
  entityType,
  esClient,
}: FindEntityByIdParams) => {
  const normalizedEntityId = normalizeEntityId(entityId, entityType);
  const escapedEntityId = escapeEsqlString(normalizedEntityId);
  const query = `FROM ${entityIndex} | WHERE entity.id == "${escapedEntityId}" | LIMIT 1`;
  const { columns, values } = await executeEsql({ query, esClient });

  if (values.length === 0) {
    const rlikePattern = escapeEsqlRlikePattern(entityId);
    const likeQuery = `FROM ${entityIndex} | WHERE entity.id RLIKE ".*${rlikePattern}.*" | LIMIT 1`;
    const { columns: likeColumns, values: likeValues } = await executeEsql({
      query: likeQuery,
      esClient,
    });
    return { query: likeQuery, columns: likeColumns, values: likeValues };
  }

  return { query, columns, values };
};

export const getEntityTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_GET_ENTITY_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieve profile for security entity (user, host, service, generic) from the Entity store using entity ID (EUID). Includes the alerts that contributed to the risk score if the entity has a risk score.`,
    schema,
    tags: ['security', 'entity-store', 'entity-analytics'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId, uiSettings }: ToolAvailabilityContext) => {
        try {
          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status === 'available') {
            // Tool is only available if entity store V2 is enabled in this space
            const isEntityStoreV2Enabled = await uiSettings.get<boolean>(FF_ENABLE_ENTITY_STORE_V2);
            if (!isEntityStoreV2Enabled) {
              return {
                status: 'unavailable',
                reason:
                  'Entity Store V2 is not enabled. Enable it via the "securitySolution:entityStoreEnableV2" setting.',
              };
            }

            const [coreStart] = await core.getStartServices();
            const esClient = coreStart.elasticsearch.client.asInternalUser;

            // Tool is only available if the latest entity store index exists for this space
            const indexExists = await esClient.indices.exists({
              index: getLatestEntitiesIndexName(spaceId),
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
      logger.info(
        `${SECURITY_GET_ENTITY_TOOL_ID} tool called with parameters ${JSON.stringify(params)}`
      );

      try {
        const { entityType, entityId, interval, date } = params;

        const client = esClient.asCurrentUser;
        const normalizedEntityId = normalizeEntityId(entityId, entityType);
        const entityIndex = getLatestEntitiesIndexName(spaceId);

        const { query, columns, values } = await findEntityById({
          entityIndex,
          entityId,
          entityType,
          esClient: client,
        });

        if (values.length === 0) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: `No entity found for id: ${normalizedEntityId}` },
              },
            ],
          };
        }

        const resolvedEntityId = String(
          getColumnValue(columns, values, ENTITY_STORE_ENTITY_ID_FIELD) ?? normalizedEntityId
        );
        const resolvedEscapedEntityId = escapeEsqlString(resolvedEntityId);

        // date takes full priority: skip risk inputs and return the profile for the matching calendar day
        if (date != null) {
          const { start, end } = dateToUtcDayRange(date);
          const snapshotQuery = `FROM ${getHistorySnapshotIndexPattern(
            spaceId
          )} | WHERE entity.id == "${resolvedEscapedEntityId}" AND @timestamp >= "${start}" AND @timestamp <= "${end}" | LIMIT 1`;
          const snapshotResponse = await executeEsql({ query: snapshotQuery, esClient: client });

          const profileHistory = snapshotResponse.values.map((row) =>
            Object.fromEntries(snapshotResponse.columns.map((col, i) => [col.name, row[i]]))
          );

          const dateResultColumns = [...columns, { name: 'profile_history', type: 'nested' }];
          const dateResultValues = [[...values[0], JSON.stringify(profileHistory)]];

          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.esqlResults,
                data: { query, columns: dateResultColumns, values: dateResultValues },
              },
            ],
          };
        }

        let resultColumns = columns;
        let resultValues = values;

        // Check if entity has a risk score; if so, fetch inputs from the risk score index
        const riskScoreNorm = getColumnValue(
          columns,
          values,
          ENTITY_STORE_RISK_SCORE_NORMALIZED_FIELD
        );

        if (riskScoreNorm != null) {
          const esType = getColumnValue(columns, values, ENTITY_STORE_ENTITY_TYPE_FIELD);
          const esId = getColumnValue(columns, values, ENTITY_STORE_ENTITY_ID_FIELD);

          if (esType != null && esId != null) {
            const alertIds = await getAlertIdsFromRiskScoreIndex({
              esClient: client,
              spaceId,
              entityId: String(esId),
              entityType: String(esType),
            });

            if (alertIds.length > 0) {
              const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
              const escapedIds = alertIds.map((id) => `"${escapeEsqlString(id)}"`).join(', ');
              const keepFields = Array.from(
                new Set(['_id', '_index', ...ESSENTIAL_ALERT_FIELDS])
              ).join(', ');

              const alertsQuery = `FROM ${alertsIndex} METADATA _id, _index | WHERE _id IN (${escapedIds}) | KEEP ${keepFields} | LIMIT ${alertIds.length}`;
              const alertsResponse = await executeEsql({ query: alertsQuery, esClient: client });

              const riskScoreInputs = alertsResponse.values.map((row) =>
                Object.fromEntries(alertsResponse.columns.map((col, i) => [col.name, row[i]]))
              );

              resultColumns = [...columns, { name: 'risk_score_inputs', type: 'nested' }];
              resultValues = [[...values[0], JSON.stringify(riskScoreInputs)]];
            }
          }
        }

        if (interval) {
          // Fetch entity snapshot data
          const snapshotQuery = `FROM ${getHistorySnapshotIndexPattern(
            spaceId
          )} | WHERE entity.id == "${resolvedEscapedEntityId}" AND @timestamp >= ${intervalToEsql(
            interval
          )} | SORT @timestamp DESC | LIMIT 100`;
          const snapshotResponse = await executeEsql({ query: snapshotQuery, esClient: client });

          const profileHistory = snapshotResponse.values.map((row) =>
            Object.fromEntries(snapshotResponse.columns.map((col, i) => [col.name, row[i]]))
          );

          resultColumns = [...resultColumns, { name: 'profile_history', type: 'nested' }];
          resultValues = [[...resultValues[0], JSON.stringify(profileHistory)]];
        }

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.esqlResults,
              data: { query, columns: resultColumns, values: resultValues },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error fetching entity from Entity Store: ${errorMessage}` },
            },
          ],
        };
      }
    },
  };
};
