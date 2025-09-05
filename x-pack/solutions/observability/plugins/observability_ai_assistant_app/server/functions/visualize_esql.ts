/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { VisualizeESQLUserIntention } from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import { correctCommonEsqlMistakes } from '@kbn/inference-plugin/common';
import {
  VISUALIZE_QUERY_FUNCTION_NAME,
  VISUALIZE_ESQL_USER_INTENTIONS,
} from '@kbn/observability-ai-assistant-plugin/common';
import { LensVisualizationType } from '@kbn/visualization-utils';
import { visualizationTypes as partitionVisualizationTypes } from '@kbn/lens-plugin/common/visualizations/partition/partition_charts_meta';
import { visualizationTypes as datatableVisualizationTypes } from '@kbn/lens-plugin/common/visualizations/datatable_visualization';
import { visualizationTypes as gaugeVisualizationTypes } from '@kbn/lens-plugin/common/visualizations/gauge_visualization';
import { visualizationTypes as heatmapVisualizationTypes } from '@kbn/lens-plugin/common/visualizations/heatmap_visualization';
import { visualizationTypes as legacymetricVisualizationTypes } from '@kbn/lens-plugin/common/visualizations/legacy_metric_visualization';
import { visualizationTypes as metricVisualizationTypes } from '@kbn/lens-plugin/common/visualizations/metric_visualization';
import { visualizationTypes as tagcloudVisualizationTypes } from '@kbn/lens-plugin/common/visualizations/tagcloud_visualization';
import { visualizationTypes as xyVisualizationTypes } from '@kbn/lens-plugin/common/visualizations/xy_visualization';
import type { VisualizationType } from '@kbn/lens-plugin/common/types';
import type { VisualizeQueryResponsev2 } from '../../common/functions/visualize_esql';
import type { FunctionRegistrationParameters } from '.';
import { runAndValidateEsqlQuery } from './query/validate_esql_query';

type VisualizationMap = Record<LensVisualizationType, VisualizationType[]>;

const visualizationMap: VisualizationMap = {
  [LensVisualizationType.XY]: xyVisualizationTypes,
  [LensVisualizationType.Pie]: partitionVisualizationTypes,
  [LensVisualizationType.Metric]: metricVisualizationTypes,
  [LensVisualizationType.Heatmap]: heatmapVisualizationTypes,
  [LensVisualizationType.Gauge]: gaugeVisualizationTypes,
  [LensVisualizationType.Datatable]: datatableVisualizationTypes,
  [LensVisualizationType.LegacyMetric]: legacymetricVisualizationTypes,
  [LensVisualizationType.Tagcloud]: tagcloudVisualizationTypes,
};

const getVisualizationSchema = (visualizations: VisualizationMap) => {
  const visualizationsSchema = Object.entries(visualizations).flatMap(
    ([visualizationId, visualizationTypes]) =>
      visualizationTypes.map((v) => ({
        visualizationId,
        shape: v.id,
        label: v.label,
        description: v.description,
        ...(v.subtypes &&
          v.subtypes.length > 0 && {
            availableSubtypes: v.subtypes,
            subtypeNote: `Use shape "${v.id}" for any of these variations: 
            ${v.subtypes.join(', ')}`,
          }),
      }))
  );

  return JSON.stringify(visualizationsSchema, null, 2);
};

const VISUALIZATION_SCHEMA = getVisualizationSchema(visualizationMap);

export const visualizeESQLFunction = {
  name: VISUALIZE_QUERY_FUNCTION_NAME,
  isInternal: true,
  description: `Use this function to visualize charts for ES|QL queries. 
  use the visualizationId and shape to specify the desired visualization.
  **Default Visualization:** If no visualization is specified, use XY bar chart (visualizationId: "${LensVisualizationType.XY}", shape: "bar").
  Available visualizations (JSON Schema):
  ${VISUALIZATION_SCHEMA}
  `,
  descriptionForUser: 'Use this function to visualize charts for ES|QL queries.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
      },
      visualization: {
        type: 'object',
        properties: {
          visualizationId: {
            type: 'string',
            enum: Object.keys(visualizationMap),
          },
          shape: {
            type: 'string',
            enum: Object.values(visualizationMap).flatMap((type) => type.map((t) => t.id)),
          },
        },
      },
      intention: {
        type: 'string',
        enum: VISUALIZE_ESQL_USER_INTENTIONS,
      },
    },
    required: ['query', 'intention'],
  } as const,
  contexts: ['core'],
};

const getMessageForLLM = (
  intention: VisualizeESQLUserIntention,
  query: string,
  hasErrors: boolean
) => {
  if (hasErrors) {
    return 'The query has syntax errors';
  }

  if (
    intention === VisualizeESQLUserIntention.executeAndReturnResults ||
    intention === VisualizeESQLUserIntention.generateQueryOnly
  ) {
    return 'These results are not visualized.';
  }

  // This message is added to avoid the model echoing the full ES|QL query back to the user.
  // The UI already shows the chart.
  return `Only the following query is visualized: \`\`\`esql\n' + ${query} + '\n\`\`\`\n
  If the query is visualized once, don't attempt to visualize the same query again immediately.
  After calling visualize_query you are done - **do NOT repeat the ES|QL query or add any further
  explanation unless the user explicitly asks for it again.** Mention that the query is visualized.`;
};

export function registerVisualizeESQLFunction({
  functions,
  resources,
  signal,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    visualizeESQLFunction,
    async ({ arguments: { query, intention } }): Promise<VisualizeQueryResponsev2> => {
      // errorMessages contains the syntax errors from the client side valdation
      // error contains the error from the server side validation, it is always one error
      // and help us identify errors like index not found, field not found etc.

      const correctedQuery = correctCommonEsqlMistakes(query).output;

      const { columns, errorMessages, rows, error } = await runAndValidateEsqlQuery({
        query: correctedQuery,
        client: (await resources.context.core).elasticsearch.client.asCurrentUser,
        signal,
      });

      const message = getMessageForLLM(intention, query, Boolean(errorMessages?.length));

      return {
        data: {
          columns: columns ?? [],
          rows: rows ?? [],
          correctedQuery,
        },
        content: {
          message,
          errorMessages: [
            ...(errorMessages ? errorMessages : []),
            ...(error ? [error.message] : []),
          ],
        },
      };
    }
  );
}
