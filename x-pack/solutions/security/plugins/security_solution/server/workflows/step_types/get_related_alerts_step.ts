/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DEFAULT_ALERTS_INDEX, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import { getSpaceIdFromRequest } from '../../agent_builder/tools/helpers';

/**
 * Parse time window string to milliseconds
 */
const parseTimeWindow = (timeWindow: string): number => {
  const match = timeWindow.match(/^(\d+)([hdms])$/);
  if (!match) {
    // Default to 1 hour if parsing fails
    return 60 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return 60 * 60 * 1000;
  }
};

const inputSchema = z.object({
  alertId: z.string().describe('The alert ID to find related alerts for'),
  alertIndex: z.string().describe('The alert index'),
  time_window: z.string().optional().default('1h').describe('Time window to search for related alerts (e.g., "1h", "24h"). Default: "1h"'),
});

const outputSchema = z.object({
  alert_id: z.string(),
  time_window: z.string(),
  entity_info: z.object({
    host_name: z.string().optional(),
    user_name: z.string().optional(),
    service_name: z.string().optional(),
  }),
  related_alerts_count: z.number(),
  related_alerts: z.array(
    z.object({
      alert_id: z.string(),
      alert_index: z.string(),
      timestamp: z.string().optional(),
      rule_name: z.string().optional(),
      severity: z.string().optional(),
      related_by_entity_type: z.array(z.string()),
    })
  ),
  message: z.string(),
});

export const getRelatedAlertsStepDefinition = createServerStepDefinition({
  id: 'security.getRelatedAlerts',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { alertId, alertIndex, time_window } = context.input;
      const spaceId = getSpaceIdFromRequest(context.contextManager.getFakeRequest());
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const timeWindow = time_window ?? '1h';
      const esClient = context.contextManager.getScopedEsClient();

      // First, fetch the alert to extract entity information
      const alertResponse = await esClient.search({
        index: alertIndex,
        size: 1,
        _source: ['host', 'user', 'service', '@timestamp'],
        query: {
          term: {
            _id: alertId,
          },
        },
      });

      if (alertResponse.hits.hits.length === 0) {
        return {
          error: new Error(`Alert with ID ${alertId} not found`),
        };
      }

      const alertSource = alertResponse.hits.hits[0]._source as any;
      const alertTimestamp = alertSource?.['@timestamp'];
      const hostName = alertSource?.host?.name;
      const userName = alertSource?.user?.name;
      const serviceName = alertSource?.service?.name;

      // Build query to find related alerts
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

      if (entityFilters.length === 0) {
        return {
          output: {
            alert_id: alertId,
            time_window: timeWindow,
            entity_info: {
              host_name: hostName,
              user_name: userName,
              service_name: serviceName,
            },
            related_alerts_count: 0,
            related_alerts: [],
            message: 'No entity information found in alert to search for related alerts.',
          },
        };
      }

      // Calculate time range from alert timestamp
      const alertTime = new Date(alertTimestamp);
      const windowMs = parseTimeWindow(timeWindow);
      const fromTime = new Date(alertTime.getTime() - windowMs);
      const toTime = new Date(alertTime.getTime() + windowMs);

      // Search for related alerts
      const relatedAlertsResponse = await esClient.search({
        index: alertsIndex,
        size: 50,
        _source: ESSENTIAL_ALERT_FIELDS,
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: entityFilters,
                  minimum_should_match: 1,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: fromTime.toISOString(),
                    lte: toTime.toISOString(),
                  },
                },
              },
            ],
            must_not: [
              {
                term: {
                  _id: alertId,
                },
              },
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
      });

      const relatedAlerts = relatedAlertsResponse.hits.hits
        .filter((hit) => hit._id != null)
        .map((hit) => {
          const source = hit._source as any;
          const matchedEntityTypes: string[] = [];
          
          // Check which entity fields matched
          if (hostName && source?.host?.name === hostName) {
            matchedEntityTypes.push('host');
          }
          if (userName && source?.user?.name === userName) {
            matchedEntityTypes.push('user');
          }
          if (serviceName && source?.service?.name === serviceName) {
            matchedEntityTypes.push('service');
          }
          
          return {
            alert_id: hit._id!,
            alert_index: hit._index,
            timestamp: source?.['@timestamp'],
            rule_name: source?.['kibana.alert.rule.name'],
            severity: source?.['kibana.alert.severity'],
            related_by_entity_type: matchedEntityTypes,
          };
        });

      return {
        output: {
          alert_id: alertId,
          time_window: timeWindow,
          entity_info: {
            host_name: hostName,
            user_name: userName,
            service_name: serviceName,
          },
          related_alerts_count: relatedAlerts.length,
          related_alerts: relatedAlerts,
          message: `Found ${relatedAlerts.length} related alert${relatedAlerts.length !== 1 ? 's' : ''} on the same entities within ${timeWindow}.`,
        },
      };
    } catch (error) {
      context.logger.error('Failed to get related alerts', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get related alerts'),
      };
    }
  },
});

