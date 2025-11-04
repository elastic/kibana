/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import datemath from '@elastic/datemath';
import { groupBy, uniq } from 'lodash';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { selectRelevantAlertFields } from './select_relevant_alert_fields';

export const OBSERVABILITY_GET_ALERTS_DATASOURCE_FIELDS_TOOL_ID =
  'observability.get_alerts_datasource_fields';

const defaultFields = [
  '@timestamp',
  'kibana.alert.start',
  'kibana.alert.end',
  'kibana.alert.flapping',
  'kibana.alert.group',
  'kibana.alert.instance.id',
  'kibana.alert.reason',
  'kibana.alert.rule.category',
  'kibana.alert.rule.name',
  'kibana.alert.rule.tags',
  'kibana.alert.start',
  'kibana.alert.status',
  'kibana.alert.time_range.gte',
  'kibana.alert.time_range.lte',
  'kibana.alert.workflow_status',
  'tags',
  // infra
  'host.name',
  'container.id',
  'kubernetes.pod.name',
  // APM
  'processor.event',
  'service.environment',
  'service.name',
  'service.node.name',
  'transaction.type',
  'transaction.name',
];

const getAlertsDatasourceFieldsSchema = z.object({
  start: z
    .string()
    .optional()
    .describe(
      'The start of the current time range, in Elasticsearch date math like `now-24h` or an ISO timestamp'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'The end of the current time range, in Elasticsearch date math like `now` or an ISO timestamp'
    ),
  query: z
    .string()
    .min(1)
    .describe('Natural language request used to guide relevant field selection'),
});

export async function createObservabilityGetAlertsDatasourceFieldsTool({
  core,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof getAlertsDatasourceFieldsSchema> = {
    id: OBSERVABILITY_GET_ALERTS_DATASOURCE_FIELDS_TOOL_ID,
    type: ToolType.builtin,
    description: 'Get fields for the alerts datasource in Observability.',
    schema: getAlertsDatasourceFieldsSchema,
    tags: ['observability', 'alerts'],
    handler: async ({ start, end, query }, toolContext) => {
      try {
        const { esClient, modelProvider, request } = toolContext as any;
        const [coreStart, pluginStart] = await core.getStartServices();

        const hasAnyHitsResponse = await esClient.asInternalUser.search({
          index: ['.alerts-observability*'],
          _source: false,
          track_total_hits: 1,
          terminate_after: 1,
        });

        const hitCount =
          typeof hasAnyHitsResponse.hits.total === 'number'
            ? hasAnyHitsResponse.hits.total
            : hasAnyHitsResponse.hits.total?.value ?? 0;

        // all fields are empty in this case, so get them all
        const includeEmptyFields = hitCount === 0;

        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
        const dataViewsService = await pluginStart.dataViews.dataViewsServiceFactory(
          savedObjectsClient,
          esClient.asInternalUser
        );

        const fields = await dataViewsService.getFieldsForWildcard({
          pattern: '.alerts-observability*',
          allowNoIndex: true,
          includeEmptyFields,
          indexFilter:
            start && end
              ? {
                  range: {
                    '@timestamp': {
                      gte: datemath.parse(start)!.toISOString(),
                      lt: datemath.parse(end)!.toISOString(),
                    },
                  },
                }
              : undefined,
        });

        // Flatten fields into [{ name, type }]
        const allFields = fields.flatMap((field) => {
          const types = field.esTypes ?? [field.type];
          return types.map((type) => ({ name: field.name, type }));
        });

        const fieldNames = uniq(allFields.map((field) => field.name));
        const groupedFields = groupBy(allFields, (field) => field.name);

        const selectedFieldNames = await selectRelevantAlertFields({
          modelProvider,
          candidateFieldNames: fieldNames,
          query,
          logger,
        });

        const typedSelectedFieldNames = selectedFieldNames.map((field) => {
          const fieldDescriptors = groupedFields[field] ?? [];
          const types = fieldDescriptors.map((d) => d.type).join(',');
          return types ? `${field}:${types}` : field;
        });

        const fieldsOutput =
          typedSelectedFieldNames.length > 0 ? typedSelectedFieldNames : defaultFields;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { fields: fieldsOutput },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting observability alerts datasource fields: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to get observability alerts datasource fields: ${error.message}`,
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
