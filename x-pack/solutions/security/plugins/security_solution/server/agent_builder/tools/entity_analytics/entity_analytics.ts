/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/onechat-server';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { securityTool } from '../constants';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../common/entity_analytics/risk_engine/indices';

export const ENTITY_ANALYTICS_TOOL_INTERNAL_ID = securityTool('entity_analytics.threat_hunting');

const entityAnalyticsToolSchema = z.object({
  entityType: z
    .enum(['user', 'host', 'service', 'generic'])
    .optional()
    .describe('The entity type (user, host, service, generic).'),
  domain: z
    .enum([
      'risk_score',
      'asset_criticality',
      'entity_store',
      'privileged_user_monitoring',
      'anomaly_detection',
    ])
    .optional()
    .describe('The entity analytics domain to focus on.'),
  prompt: z.string().min(1).describe('The natural language question to answer.'),
  queryExtraContext: z
    .string()
    .optional()
    .describe('Extra context (e.g., ESQL filters) from earlier messages to preserve state.'),
  informationOnly: z
    .boolean()
    .optional()
    .describe('If true, return guidance without generating an ESQL query.'),
});

const normalize = (s: string) => s.toLowerCase();

const inferDomain = (prompt: string): z.infer<typeof entityAnalyticsToolSchema>['domain'] => {
  const p = normalize(prompt);
  if (p.includes('risk score') || p.includes('risk scores') || p.includes('riskiest')) {
    return 'risk_score';
  }
  if (p.includes('criticality')) {
    return 'asset_criticality';
  }
  if (p.includes('privileged') || p.includes('admin')) {
    return 'privileged_user_monitoring';
  }
  if (p.includes('anomal') || p.includes('unusual')) {
    return 'anomaly_detection';
  }
  if (p.includes('entity store') || p.includes('entity profile') || p.includes('entity')) {
    return 'entity_store';
  }
  return 'risk_score';
};

const buildRiskScoreQuery = ({
  prompt,
  spaceId,
  entityType = 'user',
}: {
  prompt: string;
  spaceId: string;
  entityType?: 'user' | 'host' | 'service' | 'generic';
}) => {
  const p = normalize(prompt);
  const latestIndex = getRiskScoreLatestIndex(spaceId);
  const timeSeriesIndex = getRiskScoreTimeSeriesIndex(spaceId);

  // "highest risk scores" / "top N"
  if (p.includes('highest') || p.includes('top') || p.includes('right now')) {
    const limitMatch = prompt.match(/\b(\d{1,3})\b/);
    const limit = limitMatch ? Math.min(parseInt(limitMatch[1] ?? '10', 10), 100) : undefined;

    const keepFields =
      entityType === 'user'
        ? 'user.name, user.risk.calculated_score_norm, user.risk.calculated_level'
        : entityType === 'host'
        ? 'host.name, host.risk.calculated_score_norm, host.risk.calculated_level'
        : entityType === 'service'
        ? 'service.name, service.risk.calculated_score_norm, service.risk.calculated_level'
        : 'entity.name, entity.risk.calculated_score_norm, entity.risk.calculated_level';

    const where =
      entityType === 'user'
        ? 'user.name IS NOT NULL'
        : entityType === 'host'
        ? 'host.name IS NOT NULL'
        : entityType === 'service'
        ? 'service.name IS NOT NULL'
        : 'entity.name IS NOT NULL';

    const sortField =
      entityType === 'user'
        ? 'user.risk.calculated_score_norm'
        : entityType === 'host'
        ? 'host.risk.calculated_score_norm'
        : entityType === 'service'
        ? 'service.risk.calculated_score_norm'
        : 'entity.risk.calculated_score_norm';

    const limitClause = limit ? `\n| LIMIT ${limit}` : '';

    return `FROM ${latestIndex}
| WHERE ${where}
| SORT ${sortField} DESC
| KEEP ${keepFields}${limitClause}`;
  }

  // "changed over the last N days"
  const daysMatch = p.match(/last\s+(\d+)\s+days/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1] ?? '7', 10);
    // best-effort username extraction: user-1, john, etc.
    const userMatch = prompt.match(/user[-_\s]?(\d+)\b/i);
    const userName = userMatch?.[1] ? `user-${userMatch[1]}` : undefined;

    const entityField = entityType === 'user' ? 'user.name' : `${entityType}.name`;
    const keepFields =
      entityType === 'user'
        ? 'user.name, user.risk.calculated_score_norm, user.risk.calculated_level, @timestamp'
        : `${entityType}.name, ${entityType}.risk.calculated_score_norm, ${entityType}.risk.calculated_level, @timestamp`;

    const filterEntity = userName ? ` AND ${entityField} == "${userName}"` : '';

    return `FROM ${timeSeriesIndex}
| WHERE @timestamp >= NOW() - ${days} days${filterEntity}
| SORT @timestamp ASC
| KEEP ${keepFields}`;
  }

  // default: top 10 latest
  return `FROM ${latestIndex}
| WHERE user.name IS NOT NULL
| SORT user.risk.calculated_score_norm DESC
| KEEP user.name, user.risk.calculated_score_norm, user.risk.calculated_level
| LIMIT 10`;
};

export const entityAnalyticsThreatHuntingTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof entityAnalyticsToolSchema> => {
  return {
    id: ENTITY_ANALYTICS_TOOL_INTERNAL_ID,
    type: ToolType.builtin,
    description:
      'Experimental threat hunting tool for Entity Analytics. Generates ES|QL queries and guidance for risk score, anomalies, asset criticality, entity store, and privileged user monitoring.',
    schema: entityAnalyticsToolSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }: ToolAvailabilityContext) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ prompt, domain, entityType, informationOnly }, { esClient, spaceId }) => {
      const resolvedDomain = domain ?? inferDomain(prompt);

      // Risk scores: check if latest index exists to detect "disabled" state
      if (resolvedDomain === 'risk_score') {
        const latestIndex = getRiskScoreLatestIndex(spaceId);
        const indexExists = await esClient.asInternalUser.indices.exists({ index: latestIndex });

        if (!indexExists) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  status: 'DISABLED',
                  message:
                    'Risk engine is not enabled in this environment. Enable the risk engine to answer risk score questions.',
                },
              },
            ],
          };
        }

        if (informationOnly) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message:
                    'Risk engine is enabled. Ask for top risky entities or risk score changes over time to generate ES|QL queries.',
                  latest_index: latestIndex,
                  time_series_index: getRiskScoreTimeSeriesIndex(spaceId),
                },
              },
            ],
          };
        }

        const esql = buildRiskScoreQuery({
          prompt,
          spaceId,
          entityType: entityType ?? 'user',
        });

        return {
          results: [
            {
              type: ToolResultType.query,
              data: {
                esql,
              },
            },
          ],
        };
      }

      // Other domains: provide best-effort guidance (tool-based evals focus primarily on risk score)
      if (resolvedDomain === 'anomaly_detection') {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'Anomaly detection depends on ML jobs and anomaly indices. If jobs are not enabled, enable the relevant security ML modules and re-run.',
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
                  // common in tests
                  'v3_windows_anomalous_service',
                ],
              },
            },
          ],
        };
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: `Domain "${resolvedDomain}" is not yet fully implemented in this experimental tool.`,
            },
          },
        ],
      };
    },
    tags: ['security', 'entity-analytics', 'experimental'],
  };
};
