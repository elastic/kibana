/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Skill } from '@kbn/onechat-common/skills';
import { tool } from '@langchain/core/tools';
import type { ToolHandlerContext } from '@kbn/onechat-server/tools';
import { executeEsql } from '@kbn/onechat-genai-utils';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import DateMath from '@kbn/datemath';

import { IdentifierType } from '../../../common/api/entity_analytics/common/common.gen';
import type { EntityRiskScoreRecord } from '../../../common/api/entity_analytics/common';
import type { EntityType } from '../../../common/entity_analytics/types';
import { getRiskIndex } from '../../../common/search_strategy/security_solution/risk_score/common';
import { createGetRiskScores } from '../../lib/entity_analytics/risk_score/get_risk_score';
import { AssetCriticalityDataClient } from '../../lib/entity_analytics/asset_criticality';
import { ENTITY_STORE_INDEX_PATTERN } from '../../../common/entity_analytics/entity_store/constants';
// NOTE: we intentionally query `.ml-anomalies-*` directly for broader coverage across modules
// and test fixtures. This is more inclusive than the "shared*" patterns used in some features.
import { getPrivilegedMonitorUsersIndex } from '../../../common/entity_analytics/privileged_user_monitoring/utils';
import { createPrivilegedUsersCrudService } from '../../lib/entity_analytics/privilege_monitoring/users/privileged_users_crud';

/**
 * Safely extracts OneChat context from LangChain tool config.
 * Skill-tools receive context via config.configurable.onechat
 */
const getOneChatContext = (config: unknown): Omit<ToolHandlerContext, 'resultStore'> | null => {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const maybeConfig = config as {
    configurable?: { onechat?: Omit<ToolHandlerContext, 'resultStore'> };
  };

  return maybeConfig.configurable?.onechat ?? null;
};

const ENTITY_ANALYTICS_SKILL: Omit<Skill, 'tools'> = {
  namespace: 'security.entity_analytics',
  name: 'Entity Analytics',
  description:
    'Query and analyze Entity Analytics data (risk scores, anomalies, asset criticality, entity store, privileged users)',
  content: `# Entity Analytics (Natural Language Threat Hunting)

This skill helps answer natural-language threat hunting questions using **Entity Analytics** data:

- **Risk scores** (who is riskiest, how risk changed over time, what contributed)
- **Anomalies** (unusual behavior from ML jobs)
- **Asset criticality** (critical assets / criticality levels)
- **Entity Store** (entity profiles: users/hosts/services/generic entities)
- **Privileged User Monitoring** (who is privileged and why)

## Important dependencies
- Risk score questions require the **Risk Engine** to be enabled and risk indices to exist.
- Anomaly questions require relevant **ML jobs** to be running and producing data (ML anomalies indices).

## Tools in this skill

### 1) Risk scores
Use \`entity_analytics_get_risk_scores\` to retrieve the latest risk score for a specific entity, or list top risky entities.

Example (top 10 users):
\`\`\`
tool("entity_analytics_get_risk_scores", {
  identifierType: "user",
  identifier: "*",
  limit: 10
})
\`\`\`

Example (specific user):
\`\`\`
tool("entity_analytics_get_risk_scores", {
  identifierType: "user",
  identifier: "john"
})
\`\`\`

### 2) Asset criticality
Use \`entity_analytics_get_asset_criticality\` to list / filter asset criticality assignments.

Example (all critical assets):
\`\`\`
tool("entity_analytics_get_asset_criticality", {
  kuery: "criticality_level: critical",
  size: 100
})
\`\`\`

### 3) Entity Store
Use \`entity_analytics_search_entity_store\` to search entity profiles stored in the entity store indices.

Example (find user entities matching a name):
\`\`\`
tool("entity_analytics_search_entity_store", {
  entityTypes: ["user"],
  nameQuery: "john",
  limit: 25
})
\`\`\`

### 4) Privileged User Monitoring
Use \`entity_analytics_list_privileged_users\` to list privileged users (optionally filtered).

Example:
\`\`\`
tool("entity_analytics_list_privileged_users", {
  kuery: "user.is_privileged: true"
})
\`\`\`

### 5) Anomaly detection
Use \`entity_analytics_search_anomalies\` to search ML anomaly records in a time range.

Example:
\`\`\`
tool("entity_analytics_search_anomalies", {
  start: "now-24h",
  end: "now",
  limit: 50
})
\`\`\`
`,
};

const riskScoresSchema = z.object({
  identifierType: IdentifierType.describe('The type of entity: host, user, service, or generic'),
  identifier: z
    .string()
    .min(1)
    .describe(
      'The entity identifier value (e.g., hostname or username). Use "*" to return top entities by normalized risk score.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Max results to return when identifier="*" (default: 10)'),
});

const riskScoreTimeSeriesSchema = z.object({
  identifierType: IdentifierType.describe('The type of entity: host, user, service, or generic'),
  identifier: z
    .string()
    .min(1)
    .describe(
      'The entity identifier value (e.g., hostname or username). Wildcards are not supported.'
    ),
  start: z
    .string()
    .optional()
    .describe('Start time (ES date math like "now-90d" or ISO datetime). Default: now-90d'),
  end: z
    .string()
    .optional()
    .describe('End time (ES date math like "now" or ISO datetime). Default: now'),
  limit: z.number().int().min(1).max(1000).optional().describe('Max rows to return (default: 500)'),
});

const RISK_ENGINE_DISABLED_RESULT = {
  status: 'DISABLED',
  message:
    'Risk engine is not enabled in this environment (risk score indices are missing). Enable the risk engine to answer risk score questions.',
};

const ANOMALY_DETECTION_DISABLED_RESULT = {
  status: 'DISABLED',
  message:
    'The required anomaly detection jobs are not enabled in this environment. Enable anomaly detection jobs (Security ML modules) to answer anomaly questions.',
  suggested_job_ids: [
    // security_auth
    'auth_rare_source_ip_for_a_user',
    'suspicious_login_activity',
    'auth_rare_user',
    'auth_rare_hour_for_a_user',
    // pad-ml
    'pad_linux_rare_process_executed_by_user',
    'pad_linux_high_count_privileged_process_events_by_user',
    // lmd-ml
    'lmd_high_count_remote_file_transfer',
    'lmd_high_file_size_remote_file_transfer',
    // security_packetbeat
    'packetbeat_rare_server_domain',
    // ded-ml
    'ded_high_bytes_written_to_external_device',
    'ded_high_bytes_written_to_external_device_airdrop',
    'ded_high_sent_bytes_destination_geo_country_iso_code',
    'ded_high_sent_bytes_destination_ip',
    // common in other suites
    'v3_windows_anomalous_service',
  ],
};

const queryRiskIndexForWildcard = async ({
  esClient,
  spaceId,
  entityType,
  limit = 10,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  entityType: EntityType;
  limit: number;
}): Promise<EntityRiskScoreRecord[]> => {
  const riskIndex = getRiskIndex(spaceId, true);
  const riskField = `${entityType}.risk.calculated_score_norm`;

  const response = await esClient.search<Record<EntityType, { risk: EntityRiskScoreRecord }>>({
    index: riskIndex,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: limit,
    query: {
      bool: {
        filter: [
          {
            exists: {
              field: `${entityType}.risk`,
            },
          },
        ],
      },
    },
    sort: [
      {
        [riskField]: {
          order: 'desc',
        },
      },
    ],
  });

  return response.hits.hits
    .map((hit) => (hit._source ? hit._source[entityType]?.risk : undefined))
    .filter((risk): risk is EntityRiskScoreRecord => risk !== undefined);
};

const createGetRiskScoresTool = () => {
  return tool(
    async ({ identifierType, identifier, limit }, config) => {
      const onechat = getOneChatContext(config);
      if (!onechat) {
        throw new Error('OneChat context not available');
      }

      const logger = onechat.logger;
      const spaceId = onechat.spaceId;
      const esClient = onechat.esClient.asCurrentUser;
      const entityType = identifierType as EntityType;
      const latestRiskIndex = getRiskIndex(spaceId, true);

      logger.debug(
        `entity_analytics_get_risk_scores called with identifierType=${identifierType}, identifier=${identifier}`
      );

      const latestIndexExists = await esClient.indices.exists({ index: latestRiskIndex });
      if (!latestIndexExists) {
        return JSON.stringify({
          ...RISK_ENGINE_DISABLED_RESULT,
          latest_index: latestRiskIndex,
        });
      }

      // wildcard: return top N entities (no inputs expansion)
      if (identifier === '*') {
        const riskScores = await queryRiskIndexForWildcard({
          esClient,
          spaceId,
          entityType,
          limit: limit ?? 10,
        });

        return JSON.stringify({
          results: riskScores.map((score) => ({
            calculated_score_norm: score.calculated_score_norm,
            calculated_level: score.calculated_level,
            id_value: score.id_value,
            id_field: score.id_field,
            '@timestamp': score['@timestamp'],
            modifiers: score.modifiers ?? [],
          })),
        });
      }

      // specific entity: return latest score (+ inputs as stored)
      const getRiskScores = createGetRiskScores({
        logger,
        esClient,
        spaceId,
      });

      const scores = await getRiskScores({
        entityType,
        entityIdentifier: identifier,
        pagination: { querySize: 1, cursorStart: 0 },
      });

      return JSON.stringify({
        riskScore: scores[0] ?? null,
      });
    },
    {
      name: 'entity_analytics_get_risk_scores',
      description:
        'Get the latest entity risk score. Use identifier="*" to list top entities by normalized risk score (calculated_score_norm).',
      schema: riskScoresSchema,
    }
  );
};

const createGetRiskScoreTimeSeriesTool = () => {
  return tool(
    async ({ identifierType, identifier, start, end, limit }, config) => {
      const onechat = getOneChatContext(config);
      if (!onechat) {
        throw new Error('OneChat context not available');
      }

      const spaceId = onechat.spaceId;
      const esClient = onechat.esClient.asCurrentUser;
      const entityType = identifierType as EntityType;

      const timeSeriesIndex = getRiskIndex(spaceId, false);
      const timeSeriesExists = await esClient.indices.exists({ index: timeSeriesIndex });
      if (!timeSeriesExists) {
        return JSON.stringify({
          ...RISK_ENGINE_DISABLED_RESULT,
          time_series_index: timeSeriesIndex,
        });
      }

      const startValue = start ?? 'now-90d';
      const endValue = end ?? 'now';

      // Convert date math strings to ISO datetime strings for ES|QL
      const startDate = DateMath.parse(startValue);
      const endDate = DateMath.parse(endValue, { roundUp: true });
      if (!startDate || !endDate) {
        throw new Error(`Invalid date range: start=${startValue}, end=${endValue}`);
      }
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      const entityNameField =
        entityType === 'user'
          ? 'user.name'
          : entityType === 'host'
            ? 'host.name'
            : entityType === 'service'
              ? 'service.name'
              : 'entity.name';

      const scoreField =
        entityType === 'user'
          ? 'user.risk.calculated_score_norm'
          : entityType === 'host'
            ? 'host.risk.calculated_score_norm'
            : entityType === 'service'
              ? 'service.risk.calculated_score_norm'
              : 'entity.risk.calculated_score_norm';

      const levelField =
        entityType === 'user'
          ? 'user.risk.calculated_level'
          : entityType === 'host'
            ? 'host.risk.calculated_level'
            : entityType === 'service'
              ? 'service.risk.calculated_level'
              : 'entity.risk.calculated_level';

      const esqlQuery = `FROM ${timeSeriesIndex}
| WHERE @timestamp >= "${quote(startIso)}"
  AND @timestamp <= "${quote(endIso)}"
  AND ${entityNameField} == "${quote(identifier)}"
| KEEP @timestamp, ${entityNameField}, ${scoreField}, ${levelField}
| SORT @timestamp ASC
| LIMIT ${limit ?? 500}`;

      const response = await executeEsql({
        query: esqlQuery,
        esClient,
      });

      return JSON.stringify({
        esql: esqlQuery,
        columns: response.columns,
        values: response.values,
      });
    },
    {
      name: 'entity_analytics_get_risk_score_time_series',
      description:
        'Get a risk score time series for a specific entity over a time range. Returns ES|QL tabular results.',
      schema: riskScoreTimeSeriesSchema,
    }
  );
};

const assetCriticalitySchema = z.object({
  kuery: z
    .string()
    .optional()
    .describe(
      'Optional KQL/Kuery filter over asset criticality records (e.g., "criticality_level: critical" or "id_field: user.name and id_value: john")'
    ),
  size: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .optional()
    .describe('Maximum number of records to return (default: 100)'),
  from: z.number().int().min(0).optional().describe('Offset for pagination'),
});

const createGetAssetCriticalityTool = () => {
  return tool(
    async ({ kuery, size, from }, config) => {
      const onechat = getOneChatContext(config);
      if (!onechat) {
        throw new Error('OneChat context not available');
      }

      const dataClient = new AssetCriticalityDataClient({
        logger: onechat.logger,
        auditLogger: undefined,
        esClient: onechat.esClient.asCurrentUser,
        namespace: onechat.spaceId,
      });

      const response = await dataClient.searchByKuery({
        kuery,
        size: size ?? 100,
        from,
        sort: ['@timestamp'],
      });

      return JSON.stringify({
        index: dataClient.getIndex(),
        total: response.hits.total,
        records: response.hits.hits.map((h) => ({ id: h._id, ...(h._source ?? {}) })),
      });
    },
    {
      name: 'entity_analytics_get_asset_criticality',
      description:
        'Search asset criticality assignments. Returns asset criticality records (id_field/id_value/criticality_level, etc.).',
      schema: assetCriticalitySchema,
    }
  );
};

const privilegedUsersSchema = z.object({
  kuery: z
    .string()
    .optional()
    .describe(
      'Optional KQL/Kuery filter over privileged users (e.g., "user.name: john" or "user.is_privileged: true")'
    ),
});

const createListPrivilegedUsersTool = () => {
  return tool(
    async ({ kuery }, config) => {
      const onechat = getOneChatContext(config);
      if (!onechat) {
        throw new Error('OneChat context not available');
      }

      const index = getPrivilegedMonitorUsersIndex(onechat.spaceId);
      const crud = createPrivilegedUsersCrudService({
        esClient: onechat.esClient.asCurrentUser,
        index,
        logger: onechat.logger,
      });

      const users = await crud.list(kuery);

      return JSON.stringify({
        index,
        count: users.length,
        users,
      });
    },
    {
      name: 'entity_analytics_list_privileged_users',
      description: 'List privileged users from Privileged User Monitoring (privmon).',
      schema: privilegedUsersSchema,
    }
  );
};

const entityStoreSchema = z.object({
  entityTypes: z
    .array(z.enum(['user', 'host', 'service', 'generic']))
    .optional()
    .describe('Entity types to include. If omitted, includes all entity types.'),
  nameQuery: z
    .string()
    .optional()
    .describe('Optional partial match against entity.name (case-sensitive wildcard match).'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe('Max number of results to return (default: 50)'),
});

const quote = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const createSearchEntityStoreTool = () => {
  return tool(
    async ({ entityTypes, nameQuery, limit }, config) => {
      const onechat = getOneChatContext(config);
      if (!onechat) {
        throw new Error('OneChat context not available');
      }

      const types = entityTypes?.length ? entityTypes : ['user', 'host', 'service', 'generic'];
      const typeFilter = `entity.type IN (${types.map((t) => `"${t}"`).join(', ')})`;
      const nameFilter = nameQuery ? ` AND entity.name LIKE "*${quote(nameQuery)}*"` : '';

      const esqlQuery = `FROM ${ENTITY_STORE_INDEX_PATTERN}
| WHERE ${typeFilter}${nameFilter}
| KEEP @timestamp, entity.id, entity.name, entity.type, entity.sub_type, entity.source, entity.attributes, entity.behaviors, entity.lifecycle, entity.relationships, entity.risk, asset
| SORT @timestamp DESC
| LIMIT ${limit ?? 50}`;

      const response = await executeEsql({
        query: esqlQuery,
        esClient: onechat.esClient.asCurrentUser,
      });

      return JSON.stringify({
        esql: esqlQuery,
        columns: response.columns,
        values: response.values,
      });
    },
    {
      name: 'entity_analytics_search_entity_store',
      description:
        'Search entity store (.entities.*) for entity profiles by type and optional name query. Returns ES|QL tabular results.',
      schema: entityStoreSchema,
    }
  );
};

const anomaliesSchema = z.object({
  start: z
    .string()
    .optional()
    .describe(
      'Start time for search (ES date math like "now-24h" or ISO datetime). Default: now-24h'
    ),
  end: z
    .string()
    .optional()
    .describe('End time for search (ES date math like "now" or ISO datetime). Default: now'),
  jobIds: z
    .array(z.string())
    .optional()
    .describe('Optional list of ML job IDs to filter anomalies.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe('Max results to return (default: 100)'),
});

const createSearchAnomaliesTool = () => {
  return tool(
    async ({ start, end, jobIds, limit }, config) => {
      const onechat = getOneChatContext(config);
      if (!onechat) {
        throw new Error('OneChat context not available');
      }

      const anomaliesIndexPattern = '.ml-anomalies-*';
      const anomaliesIndicesExist = await onechat.esClient.asCurrentUser.indices.exists({
        index: anomaliesIndexPattern,
      });
      if (!anomaliesIndicesExist) {
        return JSON.stringify({
          ...ANOMALY_DETECTION_DISABLED_RESULT,
          index_pattern: anomaliesIndexPattern,
        });
      }

      const startValue = start ?? 'now-24h';
      const endValue = end ?? 'now';

      // Convert date math strings to ISO datetime strings for ES|QL
      const startDate = DateMath.parse(startValue);
      const endDate = DateMath.parse(endValue, { roundUp: true });
      if (!startDate || !endDate) {
        throw new Error(`Invalid date range: start=${startValue}, end=${endValue}`);
      }
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      const jobFilter = jobIds?.length
        ? ` AND job_id IN (${jobIds.map((id) => `"${quote(id)}"`).join(', ')})`
        : '';

      // ML anomalies use `timestamp` as the event time.
      // Note: influencer_field_values is not available as a top-level column in ES|QL (it's nested under influencers)
      const esqlQuery = `FROM ${anomaliesIndexPattern}
| WHERE result_type == "record"
  AND timestamp >= "${quote(startIso)}"
  AND timestamp <= "${quote(endIso)}"${jobFilter}
| KEEP timestamp, job_id, detector_index, record_score, probability, function, function_description, by_field_name, by_field_value, over_field_name, over_field_value, partition_field_name, partition_field_value, influencer_field_name
| SORT record_score DESC
| LIMIT ${limit ?? 100}`;

      const response = await executeEsql({
        query: esqlQuery,
        esClient: onechat.esClient.asCurrentUser,
      });

      return JSON.stringify({
        esql: esqlQuery,
        columns: response.columns,
        values: response.values,
      });
    },
    {
      name: 'entity_analytics_search_anomalies',
      description:
        'Search ML anomalies (records) in a time range, optionally filtered by job IDs. Returns ES|QL tabular results.',
      schema: anomaliesSchema,
    }
  );
};

export const getEntityAnalyticsSkill = (): Skill => {
  return {
    ...ENTITY_ANALYTICS_SKILL,
    tools: [
      createGetRiskScoresTool(),
      createGetRiskScoreTimeSeriesTool(),
      createSearchAnomaliesTool(),
      createGetAssetCriticalityTool(),
      createSearchEntityStoreTool(),
      createListPrivilegedUsersTool(),
    ],
  };
};
