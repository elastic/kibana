/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { getSpaceIdFromRequest } from '../../agent_builder/tools/helpers';

const inputSchema = z.object({
  ruleId: z.string().describe('The rule ID'),
  time_range: z.string().optional().default('30d').describe('Time range to search for closed alerts (e.g., "30d", "90d", "7d"). Default: "30d"'),
  match_alert_entities: z.object({
    alertId: z.string().describe('The alert ID (required when match_alert_entities is provided)'),
    alertIndex: z.string().describe('The alert index (required when match_alert_entities is provided)'),
  }).optional().describe('The alert entities to match. When provided, only returns closed alerts on the same host/user/entity. When omitted, returns all closed alerts for the same rule.'),
});

const outputSchema = z.object({
  alert_id: z.string(),
  rule_id: z.string(),
  time_range: z.string(),
  match_entities: z.boolean(),
  match_type: z.string(),
  entity_info: z
    .object({
      host_name: z.string().optional(),
      user_name: z.string().optional(),
      service_name: z.string().optional(),
    })
    .optional(),
  total_closed_alerts: z.number(),
  false_positive_count: z.number(),
  close_reasons_summary: z.record(z.string(), z.number()),
  closed_alerts: z.array(
    z.object({
      alert_id: z.string(),
      alert_index: z.string(),
      timestamp: z.string().optional(),
      rule_name: z.string().optional(),
      severity: z.string().optional(),
      close_reason: z.string(),
      workflow_tags: z.array(z.string()),
      status_updated_at: z.string().optional(),
      host_name: z.string().optional(),
      user_name: z.string().optional(),
      service_name: z.string().optional(),
    })
  ),
  message: z.string(),
});

export const getCloseHistoryStepDefinition = createServerStepDefinition({
  id: 'security.getCloseHistory',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { ruleId, time_range, match_alert_entities } = context.input;
      const spaceId = getSpaceIdFromRequest(context.contextManager.getFakeRequest());
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const timeRange = time_range ?? '30d';
      const esClient = context.contextManager.getScopedEsClient();

      // Extract alertId and alertIndex from match_alert_entities if provided
      const alertId = match_alert_entities?.alertId;
      const alertIndex = match_alert_entities?.alertIndex;
      const matchEntities = !!(alertId && alertIndex); // Match entities if both are provided

      // First, fetch the current alert to extract entity information if needed
      let hostName: string | undefined;
      let userName: string | undefined;
      let serviceName: string | undefined;

      if (matchEntities && alertId && alertIndex) {
        const alertResponse = await esClient.search({
          index: alertIndex,
          size: 1,
          _source: ['host', 'user', 'service'],
          query: {
            term: {
              _id: alertId,
            },
          },
        });

        if (alertResponse.hits.hits.length > 0) {
          const alertSource = alertResponse.hits.hits[0]._source as any;
          hostName = alertSource?.host?.name;
          userName = alertSource?.user?.name;
          serviceName = alertSource?.service?.name;
        }
      }

      // Build query filters
      const mustFilters: any[] = [
        {
          term: {
            'kibana.alert.rule.uuid': ruleId,
          },
        },
        {
          term: {
            'kibana.alert.workflow_status': 'closed',
          },
        },
        {
          range: {
            '@timestamp': {
              gte: `now-${timeRange}`,
              lte: 'now',
            },
          },
        },
      ];

      // Add entity filters if match_entities is true
      if (matchEntities) {
        const entityFilters = [];
        if (hostName) {
          entityFilters.push({ term: { 'host.name': hostName } });
        }
        if (userName) {
          entityFilters.push({ term: { 'user.name': userName } });
        }
        if (serviceName) {
          entityFilters.push({ term: { 'service.name': serviceName } });
        }

        if (entityFilters.length > 0) {
          mustFilters.push({
            bool: {
              should: entityFilters,
              minimum_should_match: 1,
            },
          });
        } else {
          // No entity information available, return empty result
          return {
            output: {
              alert_id: alertId || '',
              rule_id: ruleId,
              time_range: timeRange,
              match_entities: matchEntities,
              match_type: 'same rule + entities',
              total_closed_alerts: 0,
              false_positive_count: 0,
              close_reasons_summary: {},
              closed_alerts: [],
              message: 'No entity information found in alert to match similar closed alerts.',
            },
          };
        }
      }

      // Exclude the current alert if alertId is provided
      const mustNotFilters = alertId ? [
        {
          term: {
            _id: alertId,
          },
        },
      ] : [];

      // Search for closed alerts
      const closedAlertsResponse = await esClient.search({
        index: alertsIndex,
        size: 100,
        _source: [
          '@timestamp',
          'kibana.alert.workflow_status',
          'kibana.alert.workflow_reason',
          'kibana.alert.workflow_tags',
          'kibana.alert.workflow_status_updated_at',
          'kibana.alert.rule.name',
          'kibana.alert.severity',
          'host',
          'user',
          'service',
        ],
        query: {
          bool: {
            must: mustFilters,
            must_not: mustNotFilters,
          },
        },
        sort: [{ '@timestamp': 'desc' }],
      });

      const closedAlerts = closedAlertsResponse.hits.hits.map((hit) => {
        const source = hit._source as any;
        return {
          alert_id: hit._id ?? '',
          alert_index: hit._index ?? '',
          timestamp: source?.['@timestamp'],
          rule_name: source?.['kibana.alert.rule.name'],
          severity: source?.['kibana.alert.severity'],
          close_reason: source?.['kibana.alert.workflow_reason'] || 'unknown',
          workflow_tags: source?.['kibana.alert.workflow_tags'] || [],
          status_updated_at: source?.['kibana.alert.workflow_status_updated_at'],
          host_name: source?.host?.name,
          user_name: source?.user?.name,
          service_name: source?.service?.name,
        };
      });

      // Calculate summary statistics
      const closeReasonsSummary: Record<string, number> = {};
      let falsePositiveCount = 0;
      const falsePositiveTags = ['false_positive', 'fp', 'false-positive'];

      closedAlerts.forEach((alert) => {
        const reason = alert.close_reason || 'unknown';
        closeReasonsSummary[reason] = (closeReasonsSummary[reason] || 0) + 1;

        // Check if marked as false positive via reason or tags
        if (reason === 'false_positive' || alert.workflow_tags.some((tag: string) => 
          falsePositiveTags.some(fpTag => tag.toLowerCase().includes(fpTag.toLowerCase()))
        )) {
          falsePositiveCount++;
        }
      });

      const matchType = matchEntities ? 'same rule + entities' : 'same rule';
      const entityInfo = matchEntities ? {
        host_name: hostName,
        user_name: userName,
        service_name: serviceName,
      } : undefined;

      return {
        output: {
          alert_id: alertId || '',
          rule_id: ruleId,
          time_range: timeRange,
          match_entities: matchEntities,
          match_type: matchType,
          entity_info: entityInfo,
          total_closed_alerts: closedAlerts.length,
          false_positive_count: falsePositiveCount,
          close_reasons_summary: closeReasonsSummary,
          closed_alerts: closedAlerts,
          message: `Found ${closedAlerts.length} closed alert${closedAlerts.length !== 1 ? 's' : ''} for ${matchType} in the last ${timeRange}. ${falsePositiveCount > 0 ? `${falsePositiveCount} were marked as false positive.` : ''}`,
        },
      };
    } catch (error) {
      context.logger.error('Failed to get close history', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get close history'),
      };
    }
  },
});

