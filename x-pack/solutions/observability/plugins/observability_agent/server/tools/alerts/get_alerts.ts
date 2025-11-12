/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { omit } from 'lodash';
import datemath from '@elastic/datemath';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  AlertConsumers,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '@kbn/observability-plugin/common/constants';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { getRelevantAlertFields } from './get_relevant_alert_fields';

export const OBSERVABILITY_GET_ALERTS_TOOL_ID = 'observability.get_alerts';

const OMITTED_ALERT_FIELDS = [
  'event.action',
  'event.kind',
  'kibana.alert.rule.execution.uuid',
  'kibana.alert.rule.revision',
  'kibana.alert.rule.tags',
  'kibana.alert.rule.uuid',
  'kibana.alert.workflow_status',
  'kibana.space_ids',
  'kibana.alert.time_range',
  'kibana.version',
] as const;

const alertsSchema = z.object({
  start: z
    .string()
    .describe('The start of the time range, in Elasticsearch date math, like `now-24h`.')
    .min(1),
  end: z
    .string()
    .describe('The end of the time range, in Elasticsearch date math, like `now`.')
    .min(1),
  query: z.string().min(1).describe('Natural language query to guide relevant field selection.'),
  kqlFilter: z.string().optional().describe('Filter alerts by field:value pairs'),
  includeRecovered: z
    .boolean()
    .optional()
    .describe(
      'Whether to include recovered/closed alerts. Defaults to false, which means only active alerts will be returned.'
    ),
});

export function createGetAlertsTool({
  core,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof alertsSchema> = {
    id: OBSERVABILITY_GET_ALERTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieve Observability alerts and relevant fields for a given time range. Defaults to active alerts (set includeRecovered to true to include recovered alerts).`,
    schema: alertsSchema,
    tags: ['observability', 'alerts'],
    handler: async (
      { start: startAsDatemath, end: endAsDatemath, kqlFilter, includeRecovered, query },
      handlerinfo
    ) => {
      try {
        const [coreStart, pluginStart] = await core.getStartServices();
        const alertsClient = await pluginStart.ruleRegistry.getRacClientWithRequest(
          handlerinfo.request
        );

        const start = datemath.parse(startAsDatemath)!.valueOf();
        const end = datemath.parse(endAsDatemath)!.valueOf();

        const selectedFields = await getRelevantAlertFields({
          coreStart,
          pluginStart,
          request: handlerinfo.request,
          modelProvider: handlerinfo.modelProvider,
          logger,
          query,
        });

        const filters: QueryDslQueryContainer[] = [
          {
            range: {
              'kibana.alert.start': {
                gte: start,
                lte: end,
              },
            },
          },
        ];

        if (kqlFilter) {
          try {
            const astFromKqlFilter = fromKueryExpression(kqlFilter);
            const kueryQuery = toElasticsearchQuery(astFromKqlFilter);
            filters.push(kueryQuery);
          } catch (e) {
            logger.warn(`Failed to parse KQL filter: ${kqlFilter}. Error: ${e.message}`);
            logger.debug(e);
          }
        }

        if (!includeRecovered) {
          filters.push({ term: { [ALERT_STATUS]: ALERT_STATUS_ACTIVE } });
        }

        const response = await alertsClient.find({
          ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
          consumers: [
            AlertConsumers.APM,
            AlertConsumers.INFRASTRUCTURE,
            AlertConsumers.LOGS,
            AlertConsumers.UPTIME,
            AlertConsumers.SLO,
            AlertConsumers.OBSERVABILITY,
            AlertConsumers.ALERTS,
          ],
          query: {
            bool: {
              filter: filters,
            },
          },
          size: 10,
        });

        const total = (response.hits as { total: { value: number } }).total.value;
        const alerts = response.hits.hits.map((hit) =>
          omit(hit._source ?? {}, ...OMITTED_ALERT_FIELDS)
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total,
                alerts,
                selectedFields,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching observability alerts: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch observability alerts: ${error.message}`,
                stack: error.stack,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
